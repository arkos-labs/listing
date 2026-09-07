import { useMemo, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useReference } from '@/context/ReferenceContext';
import { useGoal } from '@/context/GoalContext';
import { calculerTournee, SimulateurCourse } from '@/lib/optimisation';
import { listVehiculesForRoute, suggestLocations, matchByPickup, LocationOption } from '@/lib/reference';
import { formatQte, formatEuro } from '@/lib/kpi';
import { radius, shadow } from '@/lib/theme';
import { ArrowLeft, Plus, Trash2, ArrowRight, AlertTriangle, ChevronRight } from 'lucide-react-native';

let idCounter = 0;
const newId = () => `c${++idCounter}`;

type Step = 'list' | 'add-enlevement' | 'add-livraison' | 'add-vehicule';

export default function SimulateurScreen() {
  const { colors, isDark } = useTheme();
  const { referenceCourses } = useReference();
  const { prixBon } = useGoal();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [courses, setCourses] = useState<SimulateurCourse[]>([]);
  const [step, setStep] = useState<Step>('list');

  // Champs du formulaire en cours d'ajout
  const [draftEnlev, setDraftEnlev] = useState('');
  const [draftLivr, setDraftLivr] = useState('');
  const [enlevopenAC, setEnlevOpenAC] = useState(false);
  const [livropenAC, setLivrOpenAC] = useState(false);

  // Autocomplete enlèvement
  const pickupOpts = useMemo<LocationOption[]>(
    () => suggestLocations(referenceCourses, 'lieuEnlevement', draftEnlev, 8),
    [referenceCourses, draftEnlev]
  );

  // Autocomplete livraison
  const deliveryPool = useMemo(
    () => draftEnlev.trim().length >= 2 ? matchByPickup(referenceCourses, draftEnlev) : referenceCourses,
    [referenceCourses, draftEnlev]
  );
  const livrOpts = useMemo<LocationOption[]>(
    () => suggestLocations(deliveryPool, 'lieuLivraison', draftLivr, 8),
    [deliveryPool, draftLivr]
  );

  // Chips véhicule pour la route en cours
  const routeVehicules = useMemo(
    () => draftEnlev.trim().length >= 3 && draftLivr.trim().length >= 3
      ? listVehiculesForRoute(referenceCourses, draftEnlev, draftLivr)
      : [],
    [referenceCourses, draftEnlev, draftLivr]
  );

  const resultat = useMemo(
    () => calculerTournee(courses, prixBon),
    [courses, prixBon]
  );

  const supprimerCourse = (id: string) => setCourses(cs => cs.filter(c => c.id !== id));
  const viderTout = () => setCourses([]);

  const startAdd = () => {
    setDraftEnlev('');
    setDraftLivr('');
    setStep('add-enlevement');
  };

  const selectEnlev = (v: string) => {
    setDraftEnlev(v);
    setEnlevOpenAC(false);
    setStep('add-livraison');
  };

  const selectLivr = (v: string) => {
    setDraftLivr(v);
    setLivrOpenAC(false);
    setStep('add-vehicule');
  };

  const addCourse = (vehicule: string, qteBon: number) => {
    setCourses(cs => [...cs, {
      id: newId(),
      lieuEnlevement: draftEnlev,
      lieuLivraison: draftLivr,
      qteBonBase: qteBon,
      vehicule,
    }]);
    setStep('list');
  };

  // ── VUE : liste des courses + résultat ──────────────────────────────────
  if (step === 'list') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Simulateur de tournée</Text>
            <Text style={styles.subtitle}>Calcule ce que tu gagnes vraiment après optimisation</Text>
          </View>
          {courses.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={viderTout}>
              <Trash2 size={16} color={colors.red} />
            </TouchableOpacity>
          )}
        </View>

        {/* Cours ajoutées */}
        {courses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Ajoute les courses de ton lot pour voir ce que tu vas gagner après optimisation.</Text>
          </View>
        ) : (
          <View style={[styles.card, shadow as any]}>
            {resultat.courses.map((c, i) => (
              <View
                key={c.id}
                style={[
                  styles.courseRow,
                  i < resultat.courses.length - 1 && styles.courseRowBorder,
                  c.optimise && styles.courseRowOptimise,
                ]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.adresseRow}>
                    <Text style={styles.enlev} numberOfLines={1}>{c.lieuEnlevement || '—'}</Text>
                    <ArrowRight size={11} color={colors.textFaint} />
                    <Text style={styles.livr} numberOfLines={1}>{c.lieuLivraison || '—'}</Text>
                  </View>
                  <View style={styles.bonsRow}>
                    {c.optimise ? (
                      <>
                        <AlertTriangle size={11} color={colors.amber ?? '#D97706'} />
                        <Text style={styles.bonsOptimise}>
                          {formatQte(c.qteBonBase)} → <Text style={{ color: colors.amber ?? '#D97706', fontWeight: '800' }}>{formatQte(c.qteBonOptimise)} bons</Text>
                          {'  '}
                          <Text style={styles.delta}>-0.5 optimisation</Text>
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.bonsNormal}>{formatQte(c.qteBonOptimise)} bons · {formatEuro(c.qteBonOptimise * prixBon)}</Text>
                    )}
                  </View>
                  {c.vehicule ? <Text style={styles.vehiculeLabel}>{c.vehicule}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => supprimerCourse(c.id)} style={styles.deleteBtn}>
                  <Trash2 size={14} color={colors.textFaint} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Bouton ajouter */}
        <TouchableOpacity style={[styles.addBtn, shadow as any]} onPress={startAdd}>
          <Plus size={18} color={colors.green} strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Ajouter une course</Text>
        </TouchableOpacity>

        {/* Résultat total */}
        {courses.length > 0 && (
          <View style={[styles.resultatCard, shadow as any]}>
            <Text style={styles.resultatTitle}>Résultat de la tournée</Text>

            <View style={styles.resultatRow}>
              <Text style={styles.resultatLabel}>Prix de base</Text>
              <Text style={styles.resultatValue}>{formatQte(resultat.totalBonsBase)} bons · {formatEuro(resultat.totalMontantBase)}</Text>
            </View>

            {resultat.totalDelta < 0 && (
              <View style={[styles.resultatRow, styles.resultatRowPerdu]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={13} color={colors.amber ?? '#D97706'} />
                  <Text style={[styles.resultatLabel, { color: colors.amber ?? '#D97706' }]}>Optimisation déduite</Text>
                </View>
                <Text style={[styles.resultatValue, { color: colors.amber ?? '#D97706' }]}>
                  {formatQte(resultat.totalDelta)} bons · {formatEuro(resultat.totalMontantPerdu)}
                </Text>
              </View>
            )}

            <View style={[styles.resultatRow, styles.resultatRowTotal]}>
              <Text style={styles.resultatTotalLabel}>Ce que tu gagnes</Text>
              <Text style={styles.resultatTotalValue}>{formatEuro(resultat.totalMontantOptimise)}</Text>
            </View>

            <View style={styles.resultatBons}>
              <Text style={styles.resultatBonsText}>{formatQte(resultat.totalBonsOptimise)} bons nets</Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  // ── VUE : saisie enlèvement ──────────────────────────────────────────────
  if (step === 'add-enlevement') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('list')}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Lieu d'enlèvement</Text>
        </View>

        <TextInput
          style={[styles.searchInput, shadow as any]}
          value={draftEnlev}
          onChangeText={v => { setDraftEnlev(v); setEnlevOpenAC(true); }}
          onFocus={() => setEnlevOpenAC(true)}
          placeholder="Ex. ST-LOUIS - 75010 PARIS"
          placeholderTextColor={colors.textFaint}
          autoFocus
        />

        {pickupOpts.length > 0 && (
          <View style={[styles.acList, shadow as any]}>
            {pickupOpts.map((o, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.acItem, i < pickupOpts.length - 1 && styles.acItemBorder]}
                onPress={() => selectEnlev(o.value)}
              >
                <Text style={styles.acItemText} numberOfLines={1}>{o.value}</Text>
                <ChevronRight size={14} color={colors.textFaint} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {draftEnlev.trim().length >= 3 && (
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setStep('add-livraison')}>
            <Text style={styles.confirmBtnText}>Confirmer → Livraison</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ── VUE : saisie livraison ───────────────────────────────────────────────
  if (step === 'add-livraison') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('add-enlevement')}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Lieu de livraison</Text>
        </View>

        <Text style={styles.stepHint} numberOfLines={1}>De : {draftEnlev}</Text>

        <TextInput
          style={[styles.searchInput, shadow as any]}
          value={draftLivr}
          onChangeText={v => { setDraftLivr(v); setLivrOpenAC(true); }}
          onFocus={() => setLivrOpenAC(true)}
          placeholder="Ex. TENON - 75020 PARIS"
          placeholderTextColor={colors.textFaint}
          autoFocus
        />

        {livrOpts.length > 0 && (
          <View style={[styles.acList, shadow as any]}>
            {livrOpts.map((o, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.acItem, i < livrOpts.length - 1 && styles.acItemBorder]}
                onPress={() => selectLivr(o.value)}
              >
                <Text style={styles.acItemText} numberOfLines={1}>{o.value}</Text>
                <ChevronRight size={14} color={colors.textFaint} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {draftLivr.trim().length >= 3 && (
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setStep('add-vehicule')}>
            <Text style={styles.confirmBtnText}>Confirmer → Type de course</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // ── VUE : sélection type de course ──────────────────────────────────────
  if (step === 'add-vehicule') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('add-livraison')}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Type de course</Text>
        </View>

        <View style={styles.routeRecap}>
          <Text style={styles.routeRecapText} numberOfLines={1}>{draftEnlev}</Text>
          <ArrowRight size={12} color={colors.textFaint} />
          <Text style={styles.routeRecapText} numberOfLines={1}>{draftLivr}</Text>
        </View>

        {routeVehicules.length > 0 ? (
          <View style={[styles.card, shadow as any]}>
            {routeVehicules.map((rv, i) => (
              <TouchableOpacity
                key={rv.vehicule}
                style={[styles.vehiculeRow, i < routeVehicules.length - 1 && styles.vehiculeRowBorder]}
                onPress={() => addCourse(rv.vehicule, rv.qteBon)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehiculeRowLabel}>{rv.vehicule}</Text>
                  <Text style={styles.vehiculeRowBons}>{formatQte(rv.qteBon)} bons · {formatEuro(rv.qteBon * prixBon)}</Text>
                </View>
                <ChevronRight size={16} color={colors.textFaint} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Pas de type connu pour ce trajet. Tape le nombre de bons manuellement.</Text>
            {[2, 2.5, 3, 3.5, 4, 4.5, 5].map(q => (
              <TouchableOpacity key={q} style={styles.manualQteBtn} onPress={() => addCourse('', q)}>
                <Text style={styles.manualQteBtnText}>{formatQte(q)} bons · {formatEuro(q * prixBon)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return null;
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    backBtn: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
      borderWidth: isDark ? 0 : 1, borderColor: colors.border,
    },
    clearBtn: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    stepTitle: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4, flex: 1 },
    stepHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12, fontWeight: '500' },

    emptyBox: {
      backgroundColor: colors.card, borderRadius: 18, padding: 20, marginBottom: 16,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border, alignItems: 'center', gap: 12,
    },
    emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', fontWeight: '500', lineHeight: 20 },

    card: {
      backgroundColor: colors.card, borderRadius: 18, marginBottom: 16,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border, overflow: 'hidden',
    },

    courseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    courseRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    courseRowOptimise: { backgroundColor: isDark ? 'rgba(217,119,6,0.08)' : 'rgba(251,191,36,0.08)' },
    adresseRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    enlev: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1, maxWidth: '45%' },
    livr: { fontSize: 13, fontWeight: '600', color: colors.textMuted, flexShrink: 1, maxWidth: '45%' },
    bonsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    bonsNormal: { fontSize: 12, fontWeight: '600', color: colors.green },
    bonsOptimise: { fontSize: 12, fontWeight: '600', color: colors.text },
    delta: { fontSize: 11, color: colors.amber ?? '#D97706', fontWeight: '600' },
    vehiculeLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '500' },
    deleteBtn: { padding: 6 },

    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.card, borderRadius: radius.pill, paddingVertical: 14,
      marginBottom: 16, borderWidth: 2, borderColor: colors.green, borderStyle: 'dashed',
    },
    addBtnText: { fontSize: 15, fontWeight: '700', color: colors.green },

    resultatCard: {
      backgroundColor: colors.card, borderRadius: 20, padding: 20,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border, gap: 0,
    },
    resultatTitle: { fontSize: 12, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
    resultatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    resultatRowPerdu: { borderBottomWidth: 1, borderBottomColor: colors.border },
    resultatRowTotal: { borderBottomWidth: 0, marginTop: 8 },
    resultatLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    resultatValue: { fontSize: 13, fontWeight: '700', color: colors.text },
    resultatTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    resultatTotalValue: { fontSize: 32, fontWeight: '900', color: colors.green, letterSpacing: -1 },
    resultatBons: { marginTop: 4, alignItems: 'flex-end' },
    resultatBonsText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

    searchInput: {
      backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 15, color: colors.text, fontWeight: '600', marginBottom: 8,
      borderWidth: isDark ? 0 : 1, borderColor: colors.border, outlineWidth: 0,
    },
    acList: {
      backgroundColor: colors.card, borderRadius: 16, marginBottom: 12, overflow: 'hidden',
      borderWidth: isDark ? 0 : 1, borderColor: colors.border,
    },
    acItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
    },
    acItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    acItemText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
    confirmBtn: {
      backgroundColor: colors.green, borderRadius: radius.pill, paddingVertical: 15,
      alignItems: 'center', marginTop: 8,
    },
    confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    routeRecap: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap',
    },
    routeRecapText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, flexShrink: 1, maxWidth: '45%' },

    vehiculeRow: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16,
    },
    vehiculeRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    vehiculeRowLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    vehiculeRowBons: { fontSize: 12, fontWeight: '600', color: colors.green, marginTop: 2 },

    manualQteBtn: {
      backgroundColor: isDark ? colors.bgSubtle : '#F0F2F5', borderRadius: 12,
      paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'stretch', alignItems: 'center',
    },
    manualQteBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  });
}
