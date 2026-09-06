import { useEffect, useMemo, useRef, useState, forwardRef, ForwardedRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCourses } from '@/context/CoursesContext';
import { useReference } from '@/context/ReferenceContext';
import { useTheme } from '@/context/ThemeContext';
import { useGoal } from '@/context/GoalContext';
import {
  suggestLocations,
  matchByPickup,
  resolveQte,
  listVehiculesForRoute,
  LocationOption,
  RouteVehiculeOption,
} from '@/lib/reference';
import { formatQte, formatEuro } from '@/lib/kpi';
import { computeMontant } from '@/lib/pricing';
import { SimulateurCourse, calculerTournee } from '@/lib/optimisation';
import { radius, shadow, shadowMd } from '@/lib/theme';
import { detectDomaine } from '@/lib/domaine';
import type { CourseInput } from '@/types/course';
import { Check, Minus, Plus, Sparkles, MapPin, Navigation, ArrowRight, AlertTriangle, X } from 'lucide-react-native';

const PRESETS = [1, 2, 2.5, 3, 5, 8];

export default function SaisieScreen() {
  const { add } = useCourses();
  const { referenceCourses } = useReference();
  const { colors } = useTheme();
  const { prixBon } = useGoal();
  const router = useRouter();

  const [form, setForm] = useState<CourseInput>({
    lieuEnlevement: '',
    lieuLivraison: '',
    qteBon: 0,
    montantAchat: 0,
    vehicule: '',
  });
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFromBase, setAutoFromBase] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [batch, setBatch] = useState<SimulateurCourse[]>([]);
  let batchIdCounter = batch.length;

  const refLivraison = useRef<TextInput>(null);
  const refEnlevement = useRef<TextInput>(null);
  const pickupBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deliveryBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const pickupOptions = useMemo<LocationOption[]>(
    () => suggestLocations(referenceCourses, 'lieuEnlevement', form.lieuEnlevement),
    [referenceCourses, form.lieuEnlevement]
  );

  const deliveryPool = useMemo(
    () => (form.lieuEnlevement.trim().length >= 2 ? matchByPickup(referenceCourses, form.lieuEnlevement) : referenceCourses),
    [referenceCourses, form.lieuEnlevement]
  );

  const deliveryOptions = useMemo<LocationOption[]>(
    () => suggestLocations(deliveryPool, 'lieuLivraison', form.lieuLivraison),
    [deliveryPool, form.lieuLivraison]
  );

  // Types de course disponibles pour ce trajet précis (enlèvement + livraison)
  const routeVehicules = useMemo<RouteVehiculeOption[]>(() => {
    if (form.lieuEnlevement.trim().length < 3 || form.lieuLivraison.trim().length < 3) return [];
    return listVehiculesForRoute(referenceCourses, form.lieuEnlevement, form.lieuLivraison);
  }, [referenceCourses, form.lieuEnlevement, form.lieuLivraison]);

  // Calcul de l'optimisation sur le lot complet (courses validées + course en cours)
  const lotComplet = useMemo<SimulateurCourse[]>(() => {
    const courant: SimulateurCourse[] = (form.lieuLivraison.trim() && form.qteBon > 0)
      ? [{ id: 'current', lieuEnlevement: form.lieuEnlevement, lieuLivraison: form.lieuLivraison, qteBonBase: form.qteBon, vehicule: form.vehicule || '' }]
      : [];
    return [...batch, ...courant];
  }, [batch, form.lieuLivraison, form.qteBon, form.vehicule, form.lieuEnlevement]);

  const resultatLot = useMemo(() => calculerTournee(lotComplet, prixBon), [lotComplet, prixBon]);

  const addToBatch = () => {
    if (!form.lieuEnlevement.trim() || !form.lieuLivraison.trim() || form.qteBon <= 0) return;
    setBatch(b => [...b, {
      id: `b${b.length}`,
      lieuEnlevement: form.lieuEnlevement,
      lieuLivraison: form.lieuLivraison,
      qteBonBase: form.qteBon,
      vehicule: form.vehicule || '',
    }]);
    setForm({ lieuEnlevement: '', lieuLivraison: '', qteBon: 0, montantAchat: 0, vehicule: '' });
    setAutoFromBase(false);
    refEnlevement.current?.focus();
  };

  const removeBatchItem = (id: string) => setBatch(b => b.filter(c => c.id !== id));

  const selectRouteVehicule = (vehicule: string, qteBon: number) => {
    const montantAchat = computeMontant(qteBon, prixBon);
    setForm((f) => ({ ...f, vehicule: f.vehicule === vehicule ? '' : vehicule, qteBon: f.vehicule === vehicule ? 0 : qteBon, montantAchat: f.vehicule === vehicule ? 0 : montantAchat }));
    setAutoFromBase(true);
  };
  const selectPickup = (value: string) => { setForm((f) => ({ ...f, lieuEnlevement: value, vehicule: '' })); setPickupOpen(false); refLivraison.current?.focus(); };
  const selectDelivery = (value: string) => { setForm((f) => ({ ...f, lieuLivraison: value, vehicule: '' })); setDeliveryOpen(false); };
  const onPickupFocus = () => { if (pickupBlurTimeout.current) clearTimeout(pickupBlurTimeout.current); setPickupOpen(true); };
  const onPickupBlur = () => { pickupBlurTimeout.current = setTimeout(() => setPickupOpen(false), 150); };
  const onDeliveryFocus = () => { if (deliveryBlurTimeout.current) clearTimeout(deliveryBlurTimeout.current); setDeliveryOpen(true); };
  const onDeliveryBlur = () => { deliveryBlurTimeout.current = setTimeout(() => setDeliveryOpen(false), 150); };

  // ── Suiveuses : liste unique de trajets depuis la base ──
  const suiveuseCourses = useMemo(() => {
    if (form.vehicule !== 'SUIVEUSE') return [];
    const seen = new Map<string, { lieuEnlevement: string; lieuLivraison: string; qteBon: number; count: number }>();
    for (const c of referenceCourses) {
      const key = `${c.lieuEnlevement}|${c.lieuLivraison}|${c.qteBon}`;
      if (seen.has(key)) {
        seen.get(key)!.count++;
      } else {
        seen.set(key, { lieuEnlevement: c.lieuEnlevement, lieuLivraison: c.lieuLivraison, qteBon: c.qteBon ?? 0, count: 1 });
      }
    }
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }, [referenceCourses, form.vehicule]);

  const applySuiveuse = (s: { lieuEnlevement: string; lieuLivraison: string; qteBon: number }) => {
    const montant = computeMontant(s.qteBon, prixBon);
    setForm(f => ({ ...f, lieuEnlevement: s.lieuEnlevement, lieuLivraison: s.lieuLivraison, qteBon: s.qteBon, montantAchat: montant }));
    setAutoFromBase(true);
  };

  const exactMatch = useMemo(() => {
    if (form.lieuEnlevement.trim().length < 3 || form.lieuLivraison.trim().length < 3) return null;
    return resolveQte(referenceCourses, form.lieuEnlevement, form.lieuLivraison, form.vehicule);
  }, [referenceCourses, form.lieuEnlevement, form.lieuLivraison, form.vehicule]);

  const exactMatchKey = exactMatch ? `${exactMatch.qteBon}|${exactMatch.ambiguous}` : '';

  useEffect(() => {
    if (!exactMatch) { if (autoFromBase) { setAutoFromBase(false); setForm((f) => ({ ...f, qteBon: 0 })); } return; }
    setForm((f) => ({ ...f, qteBon: exactMatch.qteBon }));
    setAutoFromBase(true);
  }, [exactMatchKey]);

  useEffect(() => {
    setForm((f) => ({ ...f, montantAchat: computeMontant(f.qteBon, prixBon) }));
  }, [form.qteBon, prixBon]);

  const setQte = (n: number) => { setAutoFromBase(false); setForm((f) => ({ ...f, qteBon: Math.max(0, n) })); };

  const submit = async () => {
    setError(null);
    if (lotComplet.length === 0) { setError("Indiquez au moins une course."); return; }
    if (form.qteBon <= 0 && batch.length === 0) { setError('Indiquez le nombre de bons.'); return; }
    setSaving(true);
    try {
      for (const c of resultatLot.courses) {
        await add({
          lieuEnlevement: c.lieuEnlevement,
          lieuLivraison: c.lieuLivraison,
          qteBon: c.qteBonOptimise,
          vehicule: c.vehicule,
          montantAchat: computeMontant(c.qteBonOptimise, prixBon),
          domaine: detectDomaine(c.lieuEnlevement, c.lieuLivraison),
          optimise: c.optimise,
        });
      }
      setBatch([]);
      setForm({ lieuEnlevement: '', lieuLivraison: '', qteBon: 0, montantAchat: 0, vehicule: '' });
      setAutoFromBase(false);
      setFlash(true);
      setTimeout(() => {
        setFlash(false);
        router.replace('/');
      }, 800);
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nouvelle course</Text>
          <Text style={styles.subtitle}>Saisie rapide · {formatEuro(prixBon)} / bon</Text>
        </View>
      </View>

      {/* ── Picker suiveuse ── */}
      {form.vehicule === 'SUIVEUSE' && suiveuseCourses.length > 0 && (
        <View style={[styles.suiveusePicker, shadow]}>
          <Text style={styles.sectionLabel}>Suiveuses disponibles</Text>
          {suiveuseCourses.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.suiveusRow,
                i < suiveuseCourses.length - 1 && styles.suiveusRowBorder,
                form.lieuEnlevement === s.lieuEnlevement && form.lieuLivraison === s.lieuLivraison && styles.suiveusRowActive,
              ]}
              onPress={() => applySuiveuse(s)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.suiveusPickup} numberOfLines={1}>{s.lieuEnlevement || '—'}</Text>
                  <ArrowRight size={12} color={colors.textFaint} />
                  <Text style={styles.suiveusDelivery} numberOfLines={1}>{s.lieuLivraison || '—'}</Text>
                </View>
                <Text style={styles.suiveusQte}>{formatQte(s.qteBon)} bon{s.qteBon > 1 ? 's' : ''} · {formatEuro(computeMontant(s.qteBon, prixBon))}</Text>
              </View>
              {s.count > 1 && (
                <View style={styles.suiveusCount}>
                  <Text style={styles.suiveusCountText}>×{s.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Enlèvement */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Enlèvement</Text>
        <View style={[styles.inputCard, shadow]}>
          <View style={styles.inputIconWrap}>
            <MapPin size={16} color={colors.green} />
          </View>
          <TextInput
            ref={refEnlevement}
            style={styles.input}
            value={form.lieuEnlevement}
            onChangeText={(v) => setForm((f) => ({ ...f, lieuEnlevement: v, vehicule: '' }))}
            onFocus={onPickupFocus}
            onBlur={onPickupBlur}
            returnKeyType="next"
            onSubmitEditing={() => refLivraison.current?.focus()}
            blurOnSubmit={false}
            placeholder="Ex. ST-LOUIS - 75010 PARIS"
            placeholderTextColor={colors.textFaint}
          />
        </View>
        {pickupOpen && pickupOptions.length > 0 ? <Dropdown options={pickupOptions} onSelect={selectPickup} colors={colors} /> : null}
      </View>

      {/* Livraison */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Livraison</Text>
        <View style={[styles.inputCard, shadow]}>
          <View style={styles.inputIconWrap}>
            <Navigation size={16} color={colors.amber ?? '#D97706'} />
          </View>
          <TextInput
            ref={refLivraison}
            style={styles.input}
            value={form.lieuLivraison}
            onChangeText={(v) => setForm((f) => ({ ...f, lieuLivraison: v, vehicule: '' }))}
            onFocus={onDeliveryFocus}
            onBlur={onDeliveryBlur}
            returnKeyType="done"
            placeholder="Ex. BICHAT - 75018 PARIS"
            placeholderTextColor={colors.textFaint}
          />
        </View>
        {deliveryOpen && deliveryOptions.length > 0 ? <Dropdown options={deliveryOptions} onSelect={selectDelivery} colors={colors} /> : null}
      </View>

      {/* Bouton + centré en dessous de livraison */}
      {form.lieuEnlevement.trim() && form.lieuLivraison.trim() && form.qteBon > 0 && (
        <View style={styles.addToBatchRow}>
          <TouchableOpacity style={styles.addToBatchBtn} onPress={addToBatch}>
            <Plus size={26} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* Types de course disponibles pour ce trajet */}
      {routeVehicules.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Type de course</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {routeVehicules.map((rv) => (
              <TouchableOpacity
                key={rv.vehicule}
                style={[styles.typeChip, form.vehicule === rv.vehicule && styles.typeChipActive]}
                onPress={() => selectRouteVehicule(rv.vehicule, rv.qteBon)}
              >
                <Text style={[styles.typeChipText, form.vehicule === rv.vehicule && styles.typeChipTextActive]} numberOfLines={1}>
                  {rv.vehicule} · {formatQte(rv.qteBon)} bon{rv.qteBon > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Lot de courses (courses déjà ajoutées) */}
      {batch.length > 0 && (
        <View style={[styles.lotCard, shadow as any]}>
          <Text style={styles.sectionLabel}>Lot en cours · {batch.length} course{batch.length > 1 ? 's' : ''} ajoutée{batch.length > 1 ? 's' : ''}</Text>
          {resultatLot.courses.slice(0, batch.length).map((c, i) => (
            <View key={c.id} style={[styles.lotRow, i < batch.length - 1 && styles.lotRowBorder]}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <Text style={styles.lotEnlev} numberOfLines={1}>{c.lieuEnlevement || '—'}</Text>
                  <ArrowRight size={10} color={colors.textFaint} />
                  <Text style={styles.lotLivr} numberOfLines={1}>{c.lieuLivraison || '—'}</Text>
                </View>
                {c.optimise ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={10} color={colors.amber ?? '#D97706'} />
                    <Text style={styles.lotBonsOptimise}>
                      {formatQte(c.qteBonBase)} → {formatQte(c.qteBonOptimise)} bons{' '}
                      <Text style={styles.lotDelta}>(-0.5 optimisation)</Text>
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.lotBons}>{formatQte(c.qteBonOptimise)} bons · {formatEuro(c.qteBonOptimise * prixBon)}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => removeBatchItem(c.id)} style={{ padding: 4 }}>
                <X size={14} color={colors.textFaint} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}


      {/* Quantité */}
      <View style={[styles.qteCard, shadow]}>
        <Text style={styles.sectionLabel}>Nombre de bons</Text>

        <View style={styles.stepperRow}>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => setQte(form.qteBon - 0.5)}>
            <Minus size={28} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.stepperCenter}>
            <Text style={styles.stepperValue}>{formatQte(resultatLot.totalBonsOptimise)}</Text>
            {batch.length > 0 && form.qteBon > 0 ? (
              <Text style={styles.stepperSub}>dont {formatQte(form.qteBon)} cette course</Text>
            ) : autoFromBase ? (
              <View style={styles.autoHint}>
                <Sparkles size={10} color={colors.green} />
                <Text style={styles.autoHintText}>{exactMatch?.ambiguous ? 'Valeur la plus fréquente' : 'Depuis la base'}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.stepperBtn} onPress={() => setQte(form.qteBon + 0.5)}>
            <Plus size={28} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p} style={[styles.presetChip, form.qteBon === p && styles.presetChipActive]} onPress={() => setQte(p)}>
              <Text style={[styles.presetChipText, form.qteBon === p && styles.presetChipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total — toujours basé sur la tournée complète */}
        <View style={styles.totalRow}>
          {lotComplet.length > 1 ? (
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.totalDetail}>
                {lotComplet.length} courses · {formatQte(resultatLot.totalBonsOptimise)} bons nets
              </Text>
              {resultatLot.totalDelta < 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={10} color={colors.amber ?? '#D97706'} />
                  <Text style={styles.totalOptimDetail}>
                    {formatQte(resultatLot.totalDelta)} bons optimisation · {formatEuro(resultatLot.totalMontantPerdu)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.totalDetail}>{formatQte(form.qteBon)} × {formatEuro(prixBon)}</Text>
          )}
          <Text style={styles.totalAmount}>{formatEuro(resultatLot.totalMontantOptimise)}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Bouton valider */}
      <TouchableOpacity
        style={[styles.submitBtn, flash && styles.submitBtnSuccess, (saving || flash) && { opacity: 0.85 }]}
        onPress={submit}
        disabled={saving || flash}
      >
        {flash ? (
          <>
            <Check size={20} color="#fff" strokeWidth={3} />
            <Text style={styles.submitBtnText}>{lotComplet.length > 1 ? `${lotComplet.length} courses enregistrées !` : 'Course enregistrée !'}</Text>
          </>
        ) : (
          <Text style={styles.submitBtnText}>
            {saving ? 'Enregistrement…' : lotComplet.length > 1 ? `Valider ${lotComplet.length} courses` : 'Valider la course'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Dropdown({ options, onSelect, colors }: { options: LocationOption[]; onSelect: (v: string) => void; colors: any }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, marginTop: 4, overflow: 'hidden', ...StyleSheet.flatten({ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }) }}>
      {options.map((o, i) => (
        <TouchableOpacity
          key={`${o.value}-${i}`}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < options.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          onPress={() => onSelect(o.value)}
        >
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{o.value}</Text>
          {o.count > 1 ? <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>×{o.count}</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36 },

    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 26, gap: 12 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },

    section: { marginBottom: 14 },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },

    typeChip: {
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeChipActive: { backgroundColor: colors.green, borderColor: colors.green },
    typeChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    typeChipTextActive: { color: '#fff', fontWeight: '700' },

    inputCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 12,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
      ...shadow as any,
    },
    inputIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.greenSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600', outlineWidth: 0, padding: 0 },

    qteCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
      ...shadow as any,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 18,
    },
    stepperBtn: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.green,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperCenter: { alignItems: 'center', flex: 1 },
    stepperValue: { fontSize: 52, fontWeight: '900', color: colors.text, letterSpacing: -2 },
    stepperSub: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
    autoHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    autoHintText: { fontSize: 11, fontWeight: '700', color: colors.green },

    presets: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    presetChip: {
      flex: 1,
      backgroundColor: isDark ? colors.bgSubtle : '#F0F2F5',
      borderRadius: 12,
      paddingVertical: 9,
      alignItems: 'center',
    },
    presetChipActive: { backgroundColor: colors.green },
    presetChipText: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
    presetChipTextActive: { color: '#fff' },

    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 16,
    },
    totalDetail: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    totalOptimDetail: { fontSize: 11, color: colors.amber ?? '#D97706', fontWeight: '600' },
    totalAmount: { fontSize: 30, fontWeight: '900', color: colors.green, letterSpacing: -0.5 },

    error: {
      color: colors.red,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 10,
      textAlign: 'center',
      backgroundColor: colors.redSoft,
      paddingVertical: 10,
      borderRadius: 12,
    },

    suiveusePicker: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
    },
    suiveusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    suiveusRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suiveusRowActive: {
      backgroundColor: colors.greenSoft,
      borderRadius: 12,
      paddingHorizontal: 10,
      marginHorizontal: -10,
    },
    suiveusPickup: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    suiveusDelivery: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      flexShrink: 1,
    },
    suiveusQte: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.green,
      marginTop: 3,
    },
    suiveusCount: {
      backgroundColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    suiveusCountText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
    },

    lotCard: {
      backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border,
    },
    lotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
    lotRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    lotEnlev: { fontSize: 12, fontWeight: '700', color: colors.text, flexShrink: 1, maxWidth: '42%' },
    lotLivr: { fontSize: 12, fontWeight: '600', color: colors.textMuted, flexShrink: 1, maxWidth: '42%' },
    lotBons: { fontSize: 11, fontWeight: '600', color: colors.green },
    lotBonsOptimise: { fontSize: 11, fontWeight: '600', color: colors.text },
    lotDelta: { fontSize: 11, color: colors.amber ?? '#D97706', fontWeight: '600' },

    addToBatchRow: {
      alignItems: 'center', justifyContent: 'center',
      marginTop: -4, marginBottom: 12,
    },
    addToBatchBtn: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.green, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },

    submitBtn: {
      backgroundColor: colors.green,
      borderRadius: radius.pill,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      shadowColor: colors.green,
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    submitBtnSuccess: { backgroundColor: colors.greenDark },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  });
}
