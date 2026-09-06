import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMoto } from '@/context/MotoContext';
import { useMaintenance } from '@/context/MaintenanceContext';
import { useTheme } from '@/context/ThemeContext';
import { formatEuro, formatQte } from '@/lib/kpi';
import { computeReminderStatus } from '@/lib/maintenance';
import { radius, shadow, heroShadow } from '@/lib/theme';
import type { MotoExpense } from '@/types/moto';
import type { MaintenanceReminder } from '@/types/maintenance';
import { Plus, Trash2, Wrench, Check, Gauge, AlertTriangle } from 'lucide-react-native';

const REMINDER_PRESETS = [
  { label: 'Vidange', intervalKm: 3000 },
  { label: 'Pneus', intervalKm: 8000 },
  { label: 'Chaîne', intervalKm: 12000 },
  { label: 'Plaquettes de frein', intervalKm: 10000 },
];

export default function MotoScreen() {
  const { expenses, totals, add, remove } = useMoto();
  const { reminders, totalKm, add: addReminder, markDone, remove: removeReminder } = useMaintenance();
  const { colors } = useTheme();

  const [piece, setPiece] = useState('');
  const [montant, setMontant] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newInterval, setNewInterval] = useState('');
  const [addingReminder, setAddingReminder] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const canAdd = piece.trim().length > 0 && parseFloat(montant.replace(',', '.')) > 0;
  const canAddReminder = newLabel.trim().length > 0 && parseFloat(newInterval.replace(',', '.')) > 0;
  const totalGeneral = useMemo(() => expenses.reduce((s, e) => s + e.montant, 0), [expenses]);

  const submit = async () => {
    const n = parseFloat(montant.replace(',', '.'));
    if (!piece.trim() || isNaN(n) || n <= 0) return;
    setAdding(true);
    try {
      await add({ piece: piece.trim(), montant: n });
      setPiece('');
      setMontant('');
    } finally {
      setAdding(false);
    }
  };

  const submitReminder = async () => {
    const n = parseFloat(newInterval.replace(',', '.'));
    if (!newLabel.trim() || isNaN(n) || n <= 0) return;
    setAddingReminder(true);
    try {
      await addReminder(newLabel.trim(), n);
      setNewLabel('');
      setNewInterval('');
    } finally {
      setAddingReminder(false);
    }
  };

  const usePreset = (p: { label: string; intervalKm: number }) => {
    setNewLabel(p.label);
    setNewInterval(String(p.intervalKm));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* Hero header */}
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroTitle}>Moto</Text>
          <Text style={styles.heroSub}>{formatQte(totalKm)} km parcourus</Text>
        </View>
        <View style={styles.heroStats}>
          {[
            { label: 'Jour', val: totals.jour },
            { label: 'Mois', val: totals.mois },
            { label: 'Année', val: totals.annee },
          ].map((s) => (
            <View key={s.label} style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{formatEuro(s.val)}</Text>
              <Text style={styles.heroStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Section entretien */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Gauge size={16} color={colors.green} />
        </View>
        <Text style={styles.sectionTitle}>Entretien</Text>
      </View>

      {/* Rappels */}
      {reminders.length > 0 && (
        <View style={{ gap: 10, marginBottom: 16 }}>
          {reminders.map((r) => (
            <ReminderCard key={r.id} reminder={r} totalKm={totalKm} onDone={() => markDone(r.id)} onDelete={() => removeReminder(r.id)} colors={colors} />
          ))}
        </View>
      )}

      {/* Form rappel */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Nouveau rappel</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
          {REMINDER_PRESETS.map((p) => (
            <TouchableOpacity key={p.label} style={styles.presetChip} onPress={() => usePreset(p)}>
              <Text style={styles.presetChipText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={styles.formInput}
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="Nom du rappel"
          placeholderTextColor={colors.textFaint}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.formInput, { flex: 1 }]}
            value={newInterval}
            onChangeText={setNewInterval}
            keyboardType="decimal-pad"
            placeholder="Tous les X km"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={submitReminder}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.okBtn}
            onPress={submitReminder}
            disabled={addingReminder}
          >
            <Plus size={18} color="#fff" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section frais */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Wrench size={16} color={colors.green} />
        </View>
        <Text style={styles.sectionTitle}>Frais moto</Text>
        <Text style={styles.sectionSub}>{formatEuro(totalGeneral)}</Text>
      </View>

      {/* Form dépense */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Nouvelle dépense</Text>
        <TextInput
          style={styles.formInput}
          value={piece}
          onChangeText={setPiece}
          placeholder="Pièce / prestation"
          placeholderTextColor={colors.textFaint}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.formInput, { flex: 1 }]}
            value={montant}
            onChangeText={setMontant}
            keyboardType="decimal-pad"
            placeholder="Montant €"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.okBtn}
            onPress={submit}
            disabled={adding}
          >
            <Plus size={18} color="#fff" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Wrench size={24} color={colors.textFaint} />
          </View>
          <Text style={styles.emptyTitle}>Aucune dépense</Text>
          <Text style={styles.emptySub}>Ajoute une pièce ci-dessus.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {expenses.map((e) => (
            <Row key={e.id} expense={e} onDelete={() => remove(e.id)} colors={colors} />
          ))}
        </View>
      )}

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

function ReminderCard({ reminder, totalKm, onDone, onDelete, colors }: {
  reminder: MaintenanceReminder;
  totalKm: number;
  onDone: () => void;
  onDelete: () => void;
  colors: any;
}) {
  const status = computeReminderStatus(reminder, totalKm);
  const barColor = status.overdue ? colors.red : status.dueSoon ? (colors.amber ?? '#D97706') : colors.green;

  return (
    <View style={[{
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: barColor,
    }, shadow as any]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {status.overdue && <AlertTriangle size={14} color={colors.red} />}
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{reminder.label}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Trash2 size={14} color={colors.textFaint} />
        </TouchableOpacity>
      </View>
      <View style={{ height: 6, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 10 }}>
        <View style={{ width: `${Math.round(status.progress * 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: 4 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: barColor }}>
          {status.overdue
            ? `En retard de ${formatQte(status.sinceLastKm - reminder.intervalKm)} km`
            : `${formatQte(status.remainingKm)} km restants`}
        </Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill }}
          onPress={onDone}
        >
          <Check size={12} color={colors.greenDark} strokeWidth={3} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.greenDark }}>Fait</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ expense, onDelete, colors }: { expense: MotoExpense; onDelete: () => void; colors: any }) {
  const d = new Date(expense.date);
  return (
    <View style={[{
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
    }, shadow as any]}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Wrench size={16} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>{expense.piece}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' }}>
          {d.toLocaleDateString('fr-FR')} · {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{formatEuro(expense.montant)}</Text>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <Trash2 size={14} color={colors.textFaint} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

    hero: {
      backgroundColor: colors.heroBg ?? '#1A5C35',
      borderRadius: 28,
      padding: 24,
      marginBottom: 24,
      marginTop: 12,
      gap: 16,
      ...heroShadow,
    },
    heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.8 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3, fontWeight: '600' },
    heroStats: { flexDirection: 'row', gap: 0 },
    heroStatItem: { flex: 1, alignItems: 'center' },
    heroStatVal: { fontSize: 15, fontWeight: '900', color: '#fff' },
    heroStatLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },

    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    sectionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, flex: 1 },
    sectionSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },

    formCard: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 22, gap: 12, ...shadow },
    formTitle: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    presetRow: { gap: 8, paddingBottom: 2 },
    presetChip: { backgroundColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
    presetChipText: { fontSize: 12, fontWeight: '800', color: colors.text },
    formInput: {
      backgroundColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
    },
    inputRow: { flexDirection: 'row', gap: 10 },
    okBtn: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.green,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    emptySub: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  });
}
