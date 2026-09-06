import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useGoal } from '@/context/GoalContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { radius, shadow } from '@/lib/theme';
import { Target, Check } from 'lucide-react-native';

export default function ReglagesScreen() {
  const { monthlyGoal, setMonthlyGoal, prixBon, setPrixBon, loading } = useGoal();
  const { colors, isDark } = useTheme();
  const { logout } = useAuth();
  const [input, setInput] = useState(String(monthlyGoal));
  const [inputPrix, setInputPrix] = useState(String(prixBon));
  const [savedGoal, setSavedGoal] = useState(false);
  const [savedPrix, setSavedPrix] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (!loading) {
      setInput(String(monthlyGoal));
      setInputPrix(String(prixBon));
    }
  }, [loading, monthlyGoal, prixBon]);

  const saveGoal = async () => {
    const n = parseFloat(input.replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    await setMonthlyGoal(n);
    setSavedGoal(true);
    setTimeout(() => setSavedGoal(false), 1500);
  };

  const savePrix = async () => {
    const n = parseFloat(inputPrix.replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    await setPrixBon(n);
    setSavedPrix(true);
    setTimeout(() => setSavedPrix(false), 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Réglages</Text>
      <Text style={styles.subtitle}>Objectifs et préférences.</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Target size={16} color={colors.textMuted} />
          <Text style={styles.cardLabel}>Objectif mensuel de bons</Text>
        </View>
        <Text style={styles.cardHint}>
          Utilisé pour la barre de progression et le message du milieu de journée sur le tableau de bord.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            keyboardType="numeric"
            placeholder="Ex. 1300"
            placeholderTextColor={colors.textFaint}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveGoal}>
            {savedGoal ? <Check size={18} color="#fff" strokeWidth={3} /> : <Text style={styles.saveBtnText}>OK</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Prix d'un bon (€)</Text>
        </View>
        <Text style={styles.cardHint}>
          Le prix à l'unité d'un bon. Il s'appliquera sur toutes vos futures saisies de courses.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputPrix}
            onChangeText={setInputPrix}
            keyboardType="numeric"
            placeholder="Ex. 2.20"
            placeholderTextColor={colors.textFaint}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={savePrix}>
            {savedPrix ? <Check size={18} color="#fff" strokeWidth={3} /> : <Text style={styles.saveBtnText}>OK</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.card, { marginTop: 24, backgroundColor: colors.redSoft, borderColor: colors.redSoft, alignItems: 'center' }]}
        onPress={logout}
      >
        <Text style={{ color: colors.red, fontWeight: '800', fontSize: 14 }}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
    title: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -0.8 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 24, fontWeight: '500' },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    cardLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    cardHint: { fontSize: 12, color: colors.textMuted, marginBottom: 16, lineHeight: 18, fontWeight: '500' },
    inputRow: { flexDirection: 'row', gap: 10 },
    input: {
      flex: 1,
      backgroundColor: colors.bg,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveBtn: {
      minWidth: 58,
      borderRadius: 14,
      backgroundColor: colors.green,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  });
}
