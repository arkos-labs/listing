import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Truck, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { shadow } from '@/lib/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Veuillez entrer votre adresse e-mail.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://listing-one.vercel.app/reset-password',
    });
    setLoading(false);
    if (err) {
      setError('Impossible d\'envoyer le lien. Vérifiez l\'adresse e-mail.');
    } else {
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isDark ? colors.bg : '#F9FAFB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Retour */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.textMuted} />
          <Text style={[styles.backText, { color: colors.textMuted }]}>Retour</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: '#134024' }]}>
            <Truck size={32} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#0F4D2C' }]}>
            Mot de passe oublié
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Text>
        </View>

        {/* Carte */}
        <View style={[styles.card, { backgroundColor: colors.card }, shadow]}>

          {sent ? (
            /* ── État succès ── */
            <View style={styles.successWrap}>
              <CheckCircle size={48} color="#16a34a" strokeWidth={1.5} />
              <Text style={[styles.successTitle, { color: colors.text }]}>E-mail envoyé !</Text>
              <Text style={[styles.successBody, { color: colors.textMuted }]}>
                Un lien de réinitialisation a été envoyé à{' '}
                <Text style={{ fontWeight: '800', color: colors.text }}>{email}</Text>.{'\n'}
                Vérifiez votre boîte de réception (et vos spams).
              </Text>
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: '#134024', marginTop: 24 }]}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.loginBtnText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Formulaire ── */
            <>
              <Text style={[styles.label, { color: colors.text }]}>ADRESSE E-MAIL</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}>
                <Mail size={20} color={colors.textFaint} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="nom@exemple.com"
                  placeholderTextColor={colors.textFaint}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={handleSubmit}
                  returnKeyType="send"
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: loading ? '#5a8a6a' : '#134024', marginTop: 24 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
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
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 32,
    padding: 4,
  },
  backText: { fontSize: 14, fontWeight: '600' },

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
  loginBtn: {
    height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  successWrap: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  successTitle: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  successBody: {
    fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 22,
  },
});
