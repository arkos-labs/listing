import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { useGoal } from '@/context/GoalContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { shadow } from '@/lib/theme';
import { Target, Check, DollarSign, LogOut, MessageSquare, Settings, ChevronRight, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const APP_VERSION = 'v2.4.0';

export default function ReglagesScreen() {
  const { monthlyGoal, setMonthlyGoal, prixBon, setPrixBon, loading } = useGoal();
  const { colors, isDark } = useTheme();
  const { logout, prenom } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState(String(monthlyGoal));
  const [inputPrix, setInputPrix] = useState(String(prixBon));
  const [savedGoal, setSavedGoal] = useState(false);
  const [savedPrix, setSavedPrix] = useState(false);

  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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

  const headerGradient: [string, string, string] = isDark
    ? ['#0C3220', '#1A5234', '#0C3220']
    : ['#0D4A28', '#1A7043', '#0F4D2C'];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ── HEADER ── */}
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.headerCard}
        >
          <View style={s.headerIconWrap}>
            <Settings size={22} color="#fff" strokeWidth={2} />
          </View>
          <Text style={s.headerTitle}>Réglages</Text>
          <Text style={s.headerSub}>Objectifs et préférences</Text>
        </LinearGradient>

        {/* ── SECTION LABEL ── */}
        <Text style={s.sectionLabel}>OBJECTIFS</Text>

        {/* ── OBJECTIF MENSUEL ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: colors.greenSoft }]}>
              <Target size={16} color={colors.green} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>Objectif mensuel</Text>
              <Text style={s.cardHint}>Barre de progression du dashboard</Text>
            </View>
          </View>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              keyboardType="numeric"
              placeholder="Ex. 1300"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={saveGoal}
              returnKeyType="done"
            />
            <Text style={s.inputSuffix}>bons</Text>
            <TouchableOpacity style={[s.saveBtn, savedGoal && s.saveBtnDone]} onPress={saveGoal}>
              {savedGoal ? <Check size={16} color="#fff" strokeWidth={3} /> : <Text style={s.saveBtnText}>OK</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PRIX DU BON ── */}
        <View style={[s.card, { marginTop: 10 }]}>
          <View style={s.cardHeader}>
            <View style={[s.cardIcon, { backgroundColor: colors.blueSoft }]}>
              <DollarSign size={16} color={colors.blue} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>Prix d'un bon</Text>
              <Text style={s.cardHint}>Appliqué à toutes vos saisies</Text>
            </View>
          </View>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={inputPrix}
              onChangeText={setInputPrix}
              keyboardType="numeric"
              placeholder="Ex. 2.20"
              placeholderTextColor={colors.textFaint}
              onSubmitEditing={savePrix}
              returnKeyType="done"
            />
            <Text style={s.inputSuffix}>€</Text>
            <TouchableOpacity style={[s.saveBtn, savedPrix && s.saveBtnDone]} onPress={savePrix}>
              {savedPrix ? <Check size={16} color="#fff" strokeWidth={3} /> : <Text style={s.saveBtnText}>OK</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION LABEL ── */}
        <Text style={[s.sectionLabel, { marginTop: 28 }]}>COMPTE</Text>

        {/* ── CONTACT SUPPORT ── */}
        <TouchableOpacity
          style={s.menuItem}
          onPress={() => router.push('/(tabs)/support')}
        >
          <View style={[s.cardIcon, { backgroundColor: colors.greenSoft }]}>
            <MessageSquare size={16} color={colors.green} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.menuLabel}>Contacter le support</Text>
            <Text style={s.menuHint}>Réponse rapide garantie</Text>
          </View>
          <ChevronRight size={18} color={colors.textFaint} />
        </TouchableOpacity>

        {/* ── DECONNEXION ── */}
        <TouchableOpacity
          style={[s.menuItem, { marginTop: 10 }]}
          onPress={logout}
        >
          <View style={[s.cardIcon, { backgroundColor: colors.redSoft }]}>
            <LogOut size={16} color={colors.red} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.menuLabel, { color: colors.red }]}>Se déconnecter</Text>
          </View>
          <ChevronRight size={18} color={colors.textFaint} />
        </TouchableOpacity>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={s.footerBadge}>
            <Shield size={12} color={colors.textFaint} strokeWidth={2} />
            <Text style={s.footerVersion}>CourseLog {APP_VERSION}</Text>
          </View>
          <Text style={s.footerCopy}>© 2024-2026 CourseLog — Tous droits réservés</Text>
        </View>

      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.bg : '#F0F4F0',
    },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'web' ? 20 : 56,
      paddingBottom: 140,
    },

    // Header
    headerCard: {
      borderRadius: 24,
      padding: 28,
      paddingBottom: 24,
      marginBottom: 24,
      alignItems: 'center',
      shadowColor: '#0F4D2C',
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    headerIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    headerSub: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.6)',
    },

    // Section
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textFaint,
      letterSpacing: 0.8,
      marginBottom: 10,
      marginLeft: 4,
    },

    // Cards
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
      ...shadow,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 1,
    },
    cardHint: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: isDark ? colors.bgSubtle : '#F3F5F7',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    inputSuffix: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textFaint,
      marginRight: -2,
    },
    saveBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.green,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#166F42',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    saveBtnDone: {
      backgroundColor: '#22c55e',
    },
    saveBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
    },

    // Menu items
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
      ...shadow,
    },
    menuLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 1,
    },
    menuHint: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },

    // Footer
    footer: {
      alignItems: 'center',
      marginTop: 36,
      gap: 6,
    },
    footerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? colors.bgSubtle : '#E8EAEE',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    footerVersion: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textFaint,
      letterSpacing: 0.3,
    },
    footerCopy: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textFaint,
      letterSpacing: 0.2,
    },
  });
}
