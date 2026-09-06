const fs = require('fs');
const path = require('path');

const content = `import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCourses } from '@/context/CoursesContext';
import { useFuel } from '@/context/FuelContext';
import { useMoto } from '@/context/MotoContext';
import { useClosures } from '@/context/ClosuresContext';
import { useGoal } from '@/context/GoalContext';
import { useWork } from '@/context/WorkContext';
import { useKm } from '@/context/KmContext';
import { formatEuro, formatQte } from '@/lib/kpi';
import { PRIX_BON } from '@/lib/pricing';
import { computeWorkTotals, formatDuration } from '@/lib/worktime';
import { colors, radius, shadow } from '@/lib/theme';
import { Plus, Lock, Sparkles, Gauge } from 'lucide-react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const { kpi, courses, loading } = useCourses();
  const { totals, add: addFuel } = useFuel();
  const { totals: motoTotals } = useMoto();
  const { closures, closeCurrentMonth } = useClosures();
  const { monthlyGoal } = useGoal();
  const { sessions: workSessions, start: startWork, stop: stopWork } = useWork();
  const { totals: kmTotals, add: addKm } = useKm();

  const [fuelInput, setFuelInput] = useState('');
  const [addingFuel, setAddingFuel] = useState(false);
  const [kmInput, setKmInput] = useState('');
  const [addingKm, setAddingKm] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long' });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const netDuMois = kpi.caMois - totals.mois - motoTotals.mois;
  const currentYearMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}\`;
  const alreadyClosed = closures.some((c) => c.yearMonth === currentYearMonth);

  const goalProgress = monthlyGoal > 0 ? Math.min(1, kpi.bonsMois / monthlyGoal) : 0;
  const remainingMonth = Math.max(0, monthlyGoal - kpi.bonsMois);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyTarget = monthlyGoal / daysInMonth;
  const remainingToday = Math.max(0, Math.ceil(dailyTarget - kpi.bonsJour));
  const aheadToday = Math.max(0, Math.round(kpi.bonsJour - dailyTarget));
  const showMiddayHint = now.getHours() >= 12;

  const workTotals = useMemo(() => computeWorkTotals(workSessions), [workSessions, tick]);
  const isWorking = !!workTotals.open;
  const hourlyRate = workTotals.jour > 0 ? kpi.caJour / workTotals.jour : 0;
  const kmRateJour = kmTotals.jour > 0 ? kpi.caJour / kmTotals.jour : 0;

  const submitFuel = async () => {
    const n = parseFloat(fuelInput.replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    setAddingFuel(true);
    try {
      await addFuel({ montant: n });
      setFuelInput('');
    } finally {
      setAddingFuel(false);
    }
  };

  const submitKm = async () => {
    const n = parseFloat(kmInput.replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    setAddingKm(true);
    try {
      await addKm({ km: n });
      setKmInput('');
    } finally {
      setAddingKm(false);
    }
  };

  const doCloseMonth = async () => {
    setClosing(true);
    try {
      await closeCurrentMonth();
      setConfirmClose(false);
    } finally {
      setClosing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Aujourd'hui</Text>
          <Text style={styles.date}>
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <View style={styles.pillGreen}>
          <Text style={styles.pillGreenText}>1 bon = {formatEuro(PRIX_BON)}</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.label}>Chiffre d'affaires du jour</Text>
        <Text style={styles.heroValue}>{formatEuro(kpi.caJour)}</Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroStatsRow}>
          <StatColumn value={String(kpi.coursesJour)} label="Courses" />
          <StatColumn value={formatQte(kpi.bonsJour)} label="Bons" />
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.smallCard}>
          <Text style={styles.label}>CA du mois</Text>
          <Text style={styles.smallValue}>{formatEuro(kpi.caMois)}</Text>
          <Text style={styles.smallSubtitle}>
            {formatQte(kpi.bonsMois)} bons · {monthName}
          </Text>
        </View>
        <View style={styles.smallCard}>
          <Text style={styles.label}>Net du mois</Text>
          <Text style={[styles.smallValue, { color: colors.green }]}>{formatEuro(netDuMois)}</Text>
          <Text style={styles.smallSubtitle}>
            - {formatEuro(totals.mois + motoTotals.mois)} frais
          </Text>
        </View>
      </View>

      <View style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <Text style={styles.label}>Objectif</Text>
          <Text style={styles.fuelYear}>
            {formatQte(kpi.bonsMois)} / {formatQte(monthlyGoal)} bons
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: \`\${Math.round(goalProgress * 100)}%\` }]} />
        </View>
        {showMiddayHint ? (
          <View style={[styles.middayHint, { backgroundColor: remainingToday > 0 ? colors.amberSoft : colors.greenSoft }]}>
            <Sparkles size={11} color={remainingToday > 0 ? colors.amber : colors.green} />
            <Text style={[styles.middayHintText, { color: remainingToday > 0 ? colors.amber : colors.greenDark }]}>
              {remainingToday > 0
                ? \`Encore \${formatQte(remainingToday)} bons auj.\`
                : aheadToday > 0
                  ? \`\${formatQte(aheadToday)} bons d'avance !\`
                  : 'Rythme du jour atteint !'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        <View style={styles.compactCard}>
          <Text style={styles.label}>Essence</Text>
          <View style={styles.fuelInputRow}>
            <TextInput
              style={styles.fuelInput}
              value={fuelInput}
              onChangeText={setFuelInput}
              keyboardType="numeric"
              placeholder="€"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={submitFuel}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.fuelAddBtn} onPress={submitFuel} disabled={addingFuel || !fuelInput.trim()}>
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.statLine}>
            <Text style={styles.fuelStatValue}>{formatEuro(totals.jour)}</Text>
            <Text style={styles.fuelStatLabel}>/j </Text>
            <Text style={styles.fuelStatValue}>{formatEuro(totals.mois)}</Text>
            <Text style={styles.fuelStatLabel}>/m</Text>
          </Text>
        </View>

        <View style={styles.compactCard}>
          <Text style={styles.label}>Km</Text>
          <View style={styles.fuelInputRow}>
            <TextInput
              style={styles.fuelInput}
              value={kmInput}
              onChangeText={setKmInput}
              keyboardType="numeric"
              placeholder="km"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={submitKm}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.fuelAddBtn} onPress={submitKm} disabled={addingKm || !kmInput.trim()}>
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.statLine}>
            <Text style={styles.fuelStatValue}>{formatQte(kmTotals.jour)}</Text>
            <Text style={styles.fuelStatLabel}>/j </Text>
            <Text style={styles.fuelStatValue}>{formatQte(kmTotals.mois)}</Text>
            <Text style={styles.fuelStatLabel}>/m</Text>
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.compactCard}>
          <Text style={styles.label}>Travail</Text>
          <Text style={styles.statLine}>
            <Text style={styles.fuelStatValue}>{formatDuration(workTotals.jour)}</Text>
            <Text style={styles.fuelStatLabel}>/j </Text>
          </Text>
          <TouchableOpacity
            style={[styles.workBtn, isWorking && styles.workBtnStop]}
            onPress={isWorking ? stopWork : startWork}
          >
            <Text style={[styles.workBtnText, isWorking && styles.workBtnTextStop]}>
              {isWorking ? 'Stop' : 'Go'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.compactCard}>
          <Text style={styles.label}>Clôture</Text>
          <Text style={styles.statLine}>
            <Text style={styles.fuelStatLabel}>{monthLabel}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.workBtn, alreadyClosed && styles.workBtnStop]}
            onPress={() => setConfirmClose(true)}
          >
            <Text style={[styles.workBtnText, alreadyClosed && styles.workBtnTextStop]}>
              {alreadyClosed ? 'Fait' : 'Valider'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal transparent visible={confirmClose} animationType="fade" onRequestClose={() => setConfirmClose(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verrouiller {monthLabel} ?</Text>
            <Text style={styles.modalBody}>
              Une photo du mois sera enregistrée pour toujours : {formatEuro(kpi.caMois)} de CA, {formatQte(kpi.bonsMois)}{' '}
              bons, {formatEuro(totals.mois)} d'essence, {formatEuro(motoTotals.mois)} de moto.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmClose(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={doCloseMonth} disabled={closing}>
                <Text style={styles.modalConfirmText}>{closing ? 'Enregistrement…' : 'Verrouiller'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatColumn({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  pillGreen: {
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  pillGreenText: { fontSize: 11, fontWeight: '700', color: colors.greenDark },
  label: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 8,
    ...shadow,
  },
  heroValue: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  heroStatsRow: { flexDirection: 'row' },
  statCol: { flex: 1, alignItems: 'flex-start' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginTop: 1 },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 12,
    ...shadow,
  },
  smallValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
  smallSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  fuelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 8,
    ...shadow,
  },
  fuelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fuelYear: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  compactCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 12,
    ...shadow,
  },
  fuelInputRow: { flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 6 },
  fuelInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  fuelAddBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.input,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLine: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  fuelStatValue: { fontSize: 12, fontWeight: '800', color: colors.text },
  fuelStatLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.green, borderRadius: 4 },
  middayHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, borderRadius: 8, padding: 8 },
  middayHintText: { fontSize: 11, fontWeight: '700', flex: 1, lineHeight: 14 },
  workBtn: {
    marginTop: 8,
    backgroundColor: colors.black,
    borderRadius: radius.input,
    paddingVertical: 10,
    alignItems: 'center',
  },
  workBtnStop: { backgroundColor: colors.amberSoft },
  workBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  workBtnTextStop: { color: colors.amber },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalBody: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 19 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.bg },
  modalCancelText: { color: colors.textMuted, fontWeight: '700' },
  modalConfirm: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.black },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
`;

fs.writeFileSync(path.join(__dirname, 'app/(tabs)/index.tsx'), content);
console.log('Done rewriting index.tsx');
