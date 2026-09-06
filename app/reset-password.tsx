import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Eye, EyeOff, Truck, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { shadow } from '@/lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Supabase injects the session automatically via the URL hash on web
  // We just need to call updateUser once the user submits
  const handleReset = async () => {
    if (!password) { setError('Veuillez entrer un nouveau mot de passe.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError('Impossible de réinitialiser le mot de passe. Le lien a peut-être expiré.');
    } else {
      setDone(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isDark ? colors.bg : '#F9FAFB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: '#134024' }]}>
            <Truck size={32} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#0F4D2C' }]}>
            Nouveau mot de passe
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }, shadow]}>

          {done ? (
            <View style={styles.successWrap}>
              <CheckCircle size={48} color="#16a34a" strokeWidth={1.5} />
              <Text style={[styles.successTitle, { color: colors.text }]}>Mot de passe mis à jour !</Text>
              <Text style={[styles.successBody, { color: colors.textMuted }]}>
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#134024', marginTop: 24 }]}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.btnText}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.text }]}>NOUVEAU MOT DE PASSE</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}>
                <Lock size={20} color={colors.textFaint} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textFaint}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPw}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
                  {showPw ? <EyeOff size={20} color={colors.textFaint} /> : <Eye size={20} color={colors.textFaint} />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>CONFIRMER LE MOT DE PASSE</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}>
                <Lock size={20} color={colors.textFaint} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textFaint}
                  value={confirm}
                  onChangeText={(v) => { setConfirm(v); setError(''); }}
                  secureTextEntry={!showConfirm}
                  onSubmitEditing={handleReset}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 4 }}>
                  {showConfirm ? <EyeOff size={20} color={colors.textFaint} /> : <Eye size={20} color={colors.textFaint} />}
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: loading ? '#5a8a6a' : '#134024', marginTop: 24 }]}
                onPress={handleReset}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
                </Text>
              </TouchableOpacity>
            </>
          )}

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28, fontWeight: '900', letterSpacing: -0.5,
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22,
  },
  card: {
    width: '100%', borderRadius: 36, padding: 28,
  },
  label: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
    marginBottom: 8, marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, height: 52, paddingHorizontal: 16,
  },
  input: {
    flex: 1, fontSize: 16, fontWeight: '500', height: '100%',
  },
  errorBox: {
    backgroundColor: '#fee2e2', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, marginTop: 14,
  },
  errorText: {
    color: '#991b1b', fontSize: 13, fontWeight: '600', textAlign: 'center',
  },
  btn: {
    height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  successWrap: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  successTitle: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  successBody: {
    fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22,
  },
});
