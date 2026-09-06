import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Truck, Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { radius, shadow } from '@/lib/theme';
import Svg, { Path } from 'react-native-svg';

export default function SignupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { signup } = useAuth();
  
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!prenom || !email || !password) {
      setSignupError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setSignupError('');
    const { error } = await signup(email, password, prenom);
    setLoading(false);
    if (error) setSignupError(error);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: isDark ? colors.bg : '#F9FAFB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* LOGO & TITRE */}
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: '#134024' }]}>
            <Truck size={32} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#0F4D2C' }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Rejoignez-nous pour gérer vos courses.
          </Text>
        </View>

        {/* CARTE D'INSCRIPTION */}
        <View style={[styles.card, { backgroundColor: colors.card }, shadow]}>
          
          <Text style={[styles.label, { color: colors.text }]}>PRÉNOM</Text>
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}>
            <User size={20} color={colors.textFaint} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Alex"
              placeholderTextColor={colors.textFaint}
              value={prenom}
              onChangeText={setPrenom}
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>ADRESSE E-MAIL</Text>
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
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6', marginBottom: 24 }]}>
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

          {signupError ? (
            <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
              <Text style={styles.errorText}>{signupError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: loading ? '#5a8a6a' : '#1A6137' }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Création…' : 'S\'inscrire'}</Text>
          </TouchableOpacity>
          
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Déjà un compte ?{' '}
            <Text 
              style={{ fontWeight: '800', color: isDark ? colors.greenLight : '#0F4D2C' }}
              onPress={() => router.push('/login')}
            >
              Se connecter
            </Text>
          </Text>
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
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  card: {
    width: '100%',
    borderRadius: 36,
    padding: 28,
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
  loginBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
