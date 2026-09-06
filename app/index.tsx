import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function Index() {
  const { colors } = useTheme();
  // The actual redirection is handled by AuthContext in a useEffect.
  // We just need this file so Expo Router has a valid route for "/" to render initially.
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.green || '#134024'} />
    </View>
  );
}
