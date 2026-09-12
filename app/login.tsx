import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Truck, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { radius, shadow } from '@/lib/theme';

const APP_VERSION = 'v2.4.0';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setLoginError('Veuillez entrer votre email et mot de passe.');
      return;
    }
    setLoading(true);
    setLoginError('');
    const { error } = await login(email, password);
    setLoading(false);
    if (error) setLoginError(error);
  };

  const logoGradient: [string, string, string] = isDark
    ? ['#0C3220', '#1E7040', '#16452C']
    : ['#0D4A28', '#1A7043', '#134024'];

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: isDark ? colors.bg : '#F5F6F8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* LOGO & BRANDING */}
        <View style={styles.header}>
          <LinearGradient
            colors={logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBox}
          >
            <Truck size={30} color="#FFF" strokeWidth={2.2} />
          </LinearGradient>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#0F4D2C' }]}>CourseLog</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Votre assistant de courses intelligent
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: isDark ? colors.bgSubtle : '#E8F5EE', borderColor: isDark ? colors.border : '#C6E7D4' }]}>
            <Text style={[styles.versionText, { color: isDark ? colors.greenLight : '#166F42' }]}>{APP_VERSION} · Stable</Text>
          </View>
        </View>

        {/* CARTE DE CONNEXION */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'transparent' }, shadow]}>
          
          <Text style={[styles.label, { color: colors.text }]}>ADRESSE E-MAIL</Text>
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}>
            <Mail size={20} color={colors.textFaint} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="nom@exemple.com"
              placeholderTextColor={colors.textFaint}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>MOT DE PASSE</Text>
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}>
            <Lock size={20} color={colors.textFaint} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? <EyeOff size={20} color={colors.textFaint} /> : <Eye size={20} color={colors.textFaint} />}
            </TouchableOpacity>
          </View>



          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={[styles.forgotText, { color: isDark ? colors.greenLight : '#1A6137' }]}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>

          {loginError ? (
            <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: loading ? '#5a8a6a' : '#1A6137' }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Connexion…' : 'Se connecter'}</Text>
          </TouchableOpacity>


        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Pas encore de compte ?{' '}
            <Text 
              style={{ fontWeight: '800', color: isDark ? colors.greenLight : '#0F4D2C' }}
              onPress={() => router.push('/signup')}
            >
              Créer un compte
            </Text>
          </Text>
        </View>

        {/* COPYRIGHT */}
        <Text style={[styles.copyright, { color: colors.textFaint }]}>
          © 2024-2026 CourseLog — Tous droits réservés
        </Text>

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
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#0F4D2C',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  versionBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    width: '100%',
    borderRadius: 36,
    padding: 28,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loginBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#1A6137',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
  },
  copyright: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 32,
    letterSpacing: 0.2,
  },
  errorBox: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
