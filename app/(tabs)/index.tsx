import { useEffect, useMemo, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useCourses } from '@/context/CoursesContext';
import { useFuel } from '@/context/FuelContext';
import { useMoto } from '@/context/MotoContext';
import { useClosures } from '@/context/ClosuresContext';
import { useGoal } from '@/context/GoalContext';
import { useWork } from '@/context/WorkContext';
import { useKm } from '@/context/KmContext';
import { useTheme } from '@/context/ThemeContext';
import { useReference } from '@/context/ReferenceContext';
import { parseExcelFile } from '@/lib/excelImport';
import { parsePdfFile } from '@/lib/pdfImport';
import { formatEuro, formatQte } from '@/lib/kpi';
import { computeWorkTotals, formatDuration } from '@/lib/worktime';
import { radius, shadow, heroShadow } from '@/lib/theme';
import { Moon, Sun, Clock, Fuel, TrendingUp, FlaskConical, PenLine, Eye, EyeOff, Upload } from 'lucide-react-native';
import { detectDomaine } from '@/lib/domaine';
import { useAuth } from '@/context/AuthContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { kpi, courses, loading } = useCourses();
  const { totals, expenses: fuelExpenses, add: addFuel } = useFuel();
  const { totals: motoTotals, expenses: motoExpenses } = useMoto();
  const { closures } = useClosures();
  const { monthlyGoal, prixBon, setPrixBon } = useGoal();
  const { sessions: workSessions, start: startWork, stop: stopWork } = useWork();
  const { totals: kmTotals, add: addKm } = useKm();
  const { isDark, colors, toggleTheme } = useTheme();
  const { importFiles } = useReference();
  const { prenom } = useAuth();

  const [fuelInput, setFuelInput] = useState('');
  const [addingFuel, setAddingFuel] = useState(false);
  const [kmInput, setKmInput] = useState('');
  const [addingKm, setAddingKm] = useState(false);
  const [simModal, setSimModal] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('listing_isHidden').then(v => {
      if (v === 'true') setIsHidden(true);
    });
  }, []);

  const toggleHidden = () => {
    setIsHidden(prev => {
      const next = !prev;
      AsyncStorage.setItem('listing_isHidden', String(next));
      return next;
    });
  };
  const [simJour1, setSimJour1] = useState('1');
  const [simJour2, setSimJour2] = useState(String(new Date().getDate()));
  const [editPrixModal, setEditPrixModal] = useState(false);
  const [prixInput, setPrixInput] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long' });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const netDuMois = kpi.caMois - totals.mois - motoTotals.mois;
  const netJour   = kpi.caJour - totals.jour;
  const netMois   = kpi.caMois - totals.mois;
  const rateJour  = kmTotals.jour > 0 ? kpi.caJour / kmTotals.jour : null;
  const rateMois  = kmTotals.mois > 0 ? kpi.caMois / kmTotals.mois : null;
  const goalProgress = monthlyGoal > 0 ? Math.min(1, kpi.bonsMois / monthlyGoal) : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: goalProgress * 100,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [goalProgress]);

  // ── SIMULATION ──
  const simResult = useMemo(() => {
    const j1 = Math.max(1, parseInt(simJour1) || 1);
    const j2 = Math.min(31, parseInt(simJour2) || now.getDate());
    const from = new Date(now.getFullYear(), now.getMonth(), j1, 0, 0, 0, 0);
    const to   = new Date(now.getFullYear(), now.getMonth(), j2, 23, 59, 59, 999);
    const inRange = (d: Date) => d >= from && d <= to;
    let ca = 0, bons = 0, nbCourses = 0, medicalCa = 0, medicalBons = 0;
    for (const c of courses) {
      const d = new Date(c.dateSaisie);
      if (!inRange(d)) continue;
      ca += c.montantAchat; bons += c.qteBon; nbCourses++;
      const dom = c.domaine ?? detectDomaine(c.lieuEnlevement ?? '', c.lieuLivraison ?? '');
      if (dom === 'medical') { medicalCa += c.montantAchat; medicalBons += c.qteBon; }
    }
    let essence = 0;
    for (const e of fuelExpenses) { if (inRange(new Date(e.date))) essence += e.montant; }
    let moto = 0;
    for (const m of motoExpenses) { if (inRange(new Date(m.date))) moto += m.montant; }
    const net = ca - essence - moto;
    return { ca, bons, nbCourses, medicalCa, medicalBons, ccCa: ca - medicalCa, ccBons: bons - medicalBons, essence, moto, net, j1, j2 };
  }, [simJour1, simJour2, courses, fuelExpenses, motoExpenses, now]);

  const workTotals = useMemo(() => computeWorkTotals(workSessions), [workSessions, tick]);
  const isWorking = !!workTotals.open;
  const hourlyRate = workTotals.jour > 0 ? kpi.caJour / workTotals.jour : 0;

  const submitFuel = async () => {
    const n = parseFloat(fuelInput.replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    setAddingFuel(true);
    try { await addFuel({ montant: n }); setFuelInput(''); }
    finally { setAddingFuel(false); }
  };

  const submitKm = async () => {
    const n = parseFloat(kmInput.replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    setAddingKm(true);
    try { await addKm({ km: n }); setKmInput(''); }
    finally { setAddingKm(false); }
  };

  const submitPrixBon = async () => {
    const n = parseFloat(prixInput.replace(',', '.'));
    if (!isNaN(n) && n > 0) await setPrixBon(n);
    setEditPrixModal(false);
  };

  const pickAndImport = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/octet-stream',
          'application/pdf',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;

      let allInputs: Awaited<ReturnType<typeof parseExcelFile>> = [];
      for (const asset of res.assets) {
        const isPdf = asset.name?.toLowerCase().endsWith('.pdf') || asset.mimeType === 'application/pdf';
        if (isPdf) {
          allInputs = allInputs.concat(await parsePdfFile(asset.uri));
        } else {
          allInputs = allInputs.concat(await parseExcelFile(asset.uri));
        }
      }

      const filesToUpload = res.assets.map(a => ({ name: a.name ?? 'fichier inconnu', uri: a.uri }));
      const inserted = await importFiles(allInputs, filesToUpload);
      setImportMsg(`✅ ${inserted} course${inserted > 1 ? 's' : ''} importée${inserted > 1 ? 's' : ''}`);
      setTimeout(() => setImportMsg(null), 4000);
    } catch {
      setImportMsg('❌ Erreur lors de l\'import');
      setTimeout(() => setImportMsg(null), 4000);
    } finally {
      setImporting(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const heroColors: [string, string, string] = isDark
    ? ['#0A2818', '#134024', '#0A2818']
    : ['#0D4A28', '#1A7043', '#0F4D2C'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        
        {/* Ligne 1 : Salutation sur toute la largeur */}
        <Text style={[styles.greeting, { marginBottom: 12 }]} numberOfLines={1} adjustsFontSizeToFit>
          {greeting}{prenom ? ` ${prenom}` : ''} 👋
        </Text>

        {/* Ligne 2 : Boutons (à droite) puis Date */}
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.importBtn, importing && { opacity: 0.6 }]}
              onPress={pickAndImport}
              disabled={importing}
            >
              {importing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Upload size={13} color="#fff" strokeWidth={2.5} />}
              <Text style={styles.importBtnText}>{importing ? 'Import…' : 'Listing'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.prixBtn}
              onPress={() => { setPrixInput(String(prixBon)); setEditPrixModal(true); }}
            >
              <PenLine size={11} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={styles.prixBtnText}>{formatEuro(prixBon)}/bon</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={toggleTheme}>
              {isDark ? <Sun size={15} color={colors.amber} /> : <Moon size={15} color={colors.textMuted} />}
            </TouchableOpacity>
          </View>
          <Text style={[styles.dateLabel, { marginTop: 6, textAlign: 'right' }]}>
            {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
          </Text>
        </View>

      </View>

      {/* Message import */}
      {importMsg && (
        <View style={[styles.importMsgBanner, {
          backgroundColor: importMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2'
        }]}>
          <Text style={[styles.importMsgText, {
            color: importMsg.startsWith('✅') ? '#065f46' : '#991b1b'
          }]}>{importMsg}</Text>
        </View>
      )}

      {/* ── HERO CARD ── */}
      <View style={[styles.heroWrap, heroShadow]}>
        <LinearGradient
          colors={heroColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroProgressTrack}>
            <Animated.View style={[styles.heroProgressFill, {
              width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
            }]} />
          </View>

          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.heroEyebrow}>CA · Aujourd'hui</Text>
              <TouchableOpacity onPress={toggleHidden} hitSlop={10}>
                {isHidden ? <EyeOff size={16} color="rgba(255,255,255,0.7)" /> : <Eye size={16} color="rgba(255,255,255,0.7)" />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.heroPill}
              onPress={() => { setPrixInput(String(prixBon)); setEditPrixModal(true); }}
            >
              <Text style={styles.heroPillText}>1 bon = {formatEuro(prixBon)}</Text>
            </TouchableOpacity>
          </View>

          {isHidden ? (
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <Text style={{ fontSize: 46, fontWeight: '900', color: 'rgba(255,255,255,0.3)', textShadowColor: 'rgba(255,255,255,0.6)', textShadowRadius: 8, letterSpacing: 4 }}>****</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.heroAmount, { textAlign: 'center', marginBottom: totals.jour > 0 ? 4 : 22 }]}>
                {formatEuro(kpi.caJour)}
              </Text>
              
              {totals.jour > 0 && (
                <Text style={{ textAlign: 'center', color: '#ff6b6b', fontWeight: '800', fontSize: 15, marginBottom: 18, marginTop: -4, letterSpacing: 0.2 }}>
                  −{formatEuro(totals.jour)} essence
                </Text>
              )}

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{kpi.coursesJour}</Text>
                  <Text style={styles.heroStatLbl}>courses</Text>
                </View>
                <View style={styles.heroStatSep} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{formatQte(kpi.bonsJour)}</Text>
                  <Text style={styles.heroStatLbl}>bons/j</Text>
                </View>
              </View>
            </>
          )}

          {monthlyGoal > 0 && (
            <View style={styles.heroGoalRow}>
              <Text style={styles.heroGoalText}>
                {formatQte(kpi.bonsMois)} / {formatQte(monthlyGoal)} bons
              </Text>
              <Text style={styles.heroGoalPct}>{Math.round(goalProgress * 100)}%</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* ── TUILES ── */}
      <View style={styles.tilesRow}>
        <View style={[styles.tile, shadow]}>
          <View style={styles.tileIconWrap}>
            <Fuel size={15} color={colors.green} />
          </View>
          <Text style={styles.tileLabel}>Essence</Text>
          <Text style={styles.tileValue}>{formatEuro(totals.mois)}<Text style={styles.tileSuffix}>/m</Text></Text>
          <View style={styles.tileInputRow}>
            <TextInput
              style={styles.tileInput}
              value={fuelInput}
              onChangeText={setFuelInput}
              keyboardType="numeric"
              placeholder="€"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={submitFuel}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.tileBtn}
              onPress={submitFuel}
              disabled={addingFuel}
            >
              <Text style={styles.tileBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.tile, shadow]}>
          <View style={styles.tileIconWrap}>
            <TrendingUp size={15} color={colors.green} />
          </View>
          <Text style={styles.tileLabel}>Kilomètres</Text>
          <Text style={styles.tileValue}>{formatQte(kmTotals.mois)}<Text style={styles.tileSuffix}> km</Text></Text>
          <View style={styles.tileInputRow}>
            <TextInput
              style={styles.tileInput}
              value={kmInput}
              onChangeText={setKmInput}
              keyboardType="numeric"
              placeholder="km"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={submitKm}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.tileBtn}
              onPress={submitKm}
              disabled={addingKm}
            >
              <Text style={styles.tileBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.tile, shadow]}>
          <View style={styles.tileIconWrap}>
            <Clock size={15} color={colors.green} />
          </View>
          <Text style={styles.tileLabel}>Travail</Text>
          <Text style={styles.tileValue}>{formatDuration(workTotals.jour)}</Text>
          {hourlyRate > 0
            ? <Text style={styles.tileRate}>{formatEuro(hourlyRate)}/h</Text>
            : <View style={{ height: 14 }} />}
          <TouchableOpacity
            style={[styles.workToggle, isWorking && styles.workToggleActive]}
            onPress={isWorking ? stopWork : startWork}
          >
            {isWorking ? (
              /* Pastille verte clignotante quand en cours */
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.green }} />
            ) : (
              <View style={styles.workDot} />
            )}
            <Text style={[styles.workToggleText, isWorking && styles.workToggleTextActive]}>
              {isWorking ? 'En cours · Stop' : 'Démarrer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CARTE RENTABILITÉ ── */}
      <View style={[styles.rentCard, shadow, { paddingVertical: 16, paddingHorizontal: 18 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingUp size={14} color={colors.green} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Rentabilité ({monthLabel})</Text>
              <TouchableOpacity onPress={toggleHidden} hitSlop={8} style={{ marginLeft: 4 }}>
                {isHidden ? <EyeOff size={14} color={colors.textFaint} /> : <Eye size={14} color={colors.textFaint} />}
              </TouchableOpacity>
            </View>

            {isHidden ? (
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.textMuted, letterSpacing: 4, textShadowColor: colors.border, textShadowRadius: 6 }}>****</Text>
            ) : (
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>
                CA: {formatEuro(kpi.caMois)} · Ess: <Text style={{ color: colors.red }}>−{formatEuro(totals.mois)}</Text>
                {kmTotals.mois > 0 && rateMois !== null && ` · ${formatEuro(rateMois)}/km`}
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            {isHidden ? (
              <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textMuted, letterSpacing: 4, textShadowColor: colors.border, textShadowRadius: 8 }}>****</Text>
            ) : (
              <Text style={{ fontSize: 22, fontWeight: '900', color: netMois >= 0 ? colors.green : colors.red, letterSpacing: -0.5 }}>
                {formatEuro(netMois)}
              </Text>
            )}
          </View>

        </View>
      </View>

      <View style={{ height: 24 }} />

      {/* ── MODAL SIMULATION ── */}
      <Modal transparent visible={simModal} animationType="fade" onRequestClose={() => setSimModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <FlaskConical size={18} color={colors.green} />
              <Text style={styles.modalTitle}>Simulation {monthLabel}</Text>
            </View>
            <Text style={styles.modalSub}>Choisis la période pour voir les totaux.</Text>

            <View style={styles.simDayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.simDayLbl}>Du jour</Text>
                <TextInput
                  style={styles.simDayInput}
                  value={simJour1}
                  onChangeText={setSimJour1}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus
                />
              </View>
              <Text style={styles.simArrow}>→</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.simDayLbl}>Au jour</Text>
                <TextInput
                  style={styles.simDayInput}
                  value={simJour2}
                  onChangeText={setSimJour2}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus
                />
              </View>
            </View>

            <View style={styles.simShortcuts}>
              {[
                { label: '1→15', j1: '1', j2: '15' },
                { label: '16→fin', j1: '16', j2: String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) },
                { label: 'Mois entier', j1: '1', j2: String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) },
                { label: "Jusqu'à auj.", j1: '1', j2: String(now.getDate()) },
              ].map((p) => {
                const active = simJour1 === p.j1 && simJour2 === p.j2;
                return (
                  <TouchableOpacity
                    key={p.label}
                    style={[styles.simShortcutBtn, active && styles.simShortcutBtnActive]}
                    onPress={() => { setSimJour1(p.j1); setSimJour2(p.j2); }}
                  >
                    <Text style={[styles.simShortcutText, active && styles.simShortcutTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.simResults}>
              <Text style={styles.simResultsTitle}>
                {simResult.nbCourses} course{simResult.nbCourses > 1 ? 's' : ''} · j{simResult.j1}→j{simResult.j2}
              </Text>
              <SimRow label="CA total" value={formatEuro(simResult.ca)} color={colors.green} bold />
              <View style={styles.simIndent}>
                <SimRow label={`🚴 À course (${formatQte(simResult.ccBons)} bons)`} value={formatEuro(simResult.ccCa)} color={colors.text} />
                <SimRow label={`🏥 Médical (${formatQte(simResult.medicalBons)} bons)`} value={formatEuro(simResult.medicalCa)} color={colors.text} />
              </View>
              <SimRow label="Essence" value={`−${formatEuro(simResult.essence)}`} color={colors.red} />
              <SimRow label="Frais moto" value={`−${formatEuro(simResult.moto)}`} color={colors.red} />
              <View style={styles.simDivider} />
              <SimRow label="Net" value={formatEuro(simResult.net)} color={simResult.net >= 0 ? colors.green : colors.red} bold />
              <SimRow label="Total bons" value={`${formatQte(simResult.bons)} bons`} color={colors.textMuted} />
            </View>

            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={() => setSimModal(false)}>
              <Text style={styles.btnPrimaryText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL PRIX DU BON ── */}
      <Modal transparent visible={editPrixModal} animationType="fade" onRequestClose={() => setEditPrixModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { paddingTop: 28 }]}>
            <Text style={styles.modalTitle}>Prix du bon</Text>
            <Text style={styles.modalSub}>Montant appliqué à toutes les saisies.</Text>
            <TextInput
              style={[styles.simDayInput, { fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 16, width: '100%' }]}
              value={prixInput}
              onChangeText={setPrixInput}
              keyboardType="decimal-pad"
              placeholder="5,10"
              placeholderTextColor={colors.textFaint}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setEditPrixModal(false)}>
                <Text style={styles.btnSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={submitPrixBon}>
                <Text style={styles.btnPrimaryText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

function SimRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
      <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500', flex: 1, paddingRight: 8 }}>{label}</Text>
      <Text style={{ fontSize: 14, color, fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 36 },

    header: {
      marginBottom: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    greeting: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      flexShrink: 1,
    },
    dateLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      fontWeight: '500',
      textAlign: 'center',
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    prixBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },
    prixBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    importBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#134024',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    importBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    importMsgBanner: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 10,
    },
    importMsgText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Hero
    heroWrap: {
      borderRadius: 24,
      marginBottom: 16,
      overflow: 'hidden',
    },
    heroCard: {
      borderRadius: 24,
      padding: 24,
      overflow: 'hidden',
    },
    heroProgressTrack: {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    heroProgressFill: {
      height: '100%',
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    heroEyebrow: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.5)',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    heroPill: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    heroPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.9)',
    },
    heroAmount: {
      fontSize: 46,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -1.5,
      marginBottom: 22,
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatVal: {
      fontSize: 18,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -0.3,
    },
    heroStatLbl: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.5)',
      fontWeight: '600',
      marginTop: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    heroStatSep: {
      width: 1,
      height: 26,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    heroGoalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    heroGoalText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '600',
    },
    heroGoalPct: {
      fontSize: 13,
      color: '#fff',
      fontWeight: '800',
    },

    // Tuiles
    tilesRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    tile: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
    },
    tileIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.greenSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    tileLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    tileValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
      marginBottom: 10,
    },
    tileSuffix: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textFaint,
    },
    tileRate: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.green,
      marginBottom: 10,
    },
    tileInputRow: { width: '100%' },
    tileInput: {
      width: '100%',
      backgroundColor: isDark ? colors.bgSubtle : '#F5F6F8',
      borderRadius: 10,
      paddingLeft: 8,
      paddingRight: 36,
      paddingVertical: 8,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      minHeight: 34,
    },
    tileBtn: {
      position: 'absolute',
      right: 0, top: 0, bottom: 0,
      width: 34,
      borderRadius: 10,
      backgroundColor: colors.green,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileBtnDisabled: { opacity: 0.35 },
    tileBtnText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 22,
    },
    workToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      width: '100%',
      borderRadius: 10,
      paddingVertical: 9,
      backgroundColor: colors.green,
      minHeight: 34,
    },
    workToggleActive: {
      backgroundColor: colors.greenSoft,
      borderWidth: 1.5,
      borderColor: colors.green,
    },
    workDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: 'rgba(255,255,255,0.7)',
    },
    workDotActive: { backgroundColor: colors.green },
    workToggleText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#fff',
    },
    workToggleTextActive: { color: colors.green },

    // Carte rentabilité
    rentCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
    },
    rentHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    rentTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      flex: 1,
    },
    rentSimBtn: {
      backgroundColor: colors.greenSoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    rentSimText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.green,
    },
    rentCols: {
      flexDirection: 'row',
      gap: 0,
    },
    rentCol: {
      flex: 1,
      paddingHorizontal: 6,
    },
    rentColLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    rentCA: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    rentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    rentRowVal: {
      fontSize: 12,
      fontWeight: '700',
    },
    rentSep: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 6,
    },
    rentNet: {
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    rentKm: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 4,
    },
    rentRate: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.green,
      marginTop: 2,
    },
    rentVDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },

    // Modals
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 22,
      width: '100%',
      maxWidth: 390,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    modalSub: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '500',
      marginBottom: 18,
    },
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 20,
    },
    btnPrimary: {
      paddingVertical: 13,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: colors.green,
      alignItems: 'center',
    },
    btnPrimaryText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
    },
    btnSecondary: {
      paddingHorizontal: 18,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: isDark ? colors.bgSubtle : '#F0F2F5',
      alignItems: 'center',
    },
    btnSecondaryText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
    },

    // Simulation
    simDayRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      marginBottom: 14,
    },
    simDayLbl: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    simDayInput: {
      backgroundColor: isDark ? colors.bgSubtle : '#F0F2F5',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    simArrow: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textFaint,
      paddingBottom: 12,
    },
    simShortcuts: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 18,
    },
    simShortcutBtn: {
      flex: 1,
      backgroundColor: isDark ? colors.bgSubtle : '#F0F2F5',
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    simShortcutBtnActive: { backgroundColor: colors.green },
    simShortcutText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textMuted,
      textAlign: 'center',
    },
    simShortcutTextActive: { color: '#fff' },
    simResults: {
      backgroundColor: isDark ? colors.bgSubtle : '#F5F6F8',
      borderRadius: 16,
      padding: 16,
    },
    simResultsTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    simIndent: {
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
      marginBottom: 2,
    },
    simDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 6,
    },
  });
}
