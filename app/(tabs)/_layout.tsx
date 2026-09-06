import { useMemo } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Pencil, History, Settings, Bike } from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { DriverNotifListener } from '@/components/DriverNotifListener';

/** Icône moto custom en SVG — lucide n'en a pas */
function MotoIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Roue arrière */}
      <Circle cx="5" cy="17" r="3.2" stroke={color} strokeWidth="1.8" />
      {/* Roue avant */}
      <Circle cx="19" cy="17" r="3.2" stroke={color} strokeWidth="1.8" />
      {/* Châssis principal (bras oscillant → moteur → fourche) */}
      <Path
        d="M5 17 L7 13 L10 12 L14 12 L16.5 14.5 L19 17"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Réservoir / selle — bosse caractéristique */}
      <Path
        d="M9.5 12 L10.5 8 L13.5 8 L14 12"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Sommet selle (trait plus épais = assise) */}
      <Path
        d="M10.5 8 L13.5 8"
        stroke={color} strokeWidth="2.6" strokeLinecap="round"
      />
      {/* Guidon */}
      <Path
        d="M14.5 10 L17.5 8.5 L20.5 8.5"
        stroke={color} strokeWidth="1.8" strokeLinecap="round"
      />
      {/* Échappement */}
      <Path
        d="M7.5 15.5 L5.5 17"
        stroke={color} strokeWidth="1.4" strokeLinecap="round"
      />
    </Svg>
  );
}

function TabIcon({ Icon, focused }: { Icon: any; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[
      tabIconStyles.wrap,
      focused && { backgroundColor: colors.green },
    ]}>
      <Icon
        size={20}
        color={focused ? '#fff' : colors.textFaint}
        strokeWidth={focused ? 2.4 : 1.7}
      />
    </View>
  );
}

function MotoTabIcon({ focused }: { focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[
      tabIconStyles.wrap,
      focused && { backgroundColor: colors.green },
    ]}>
      <MotoIcon color={focused ? '#fff' : colors.textFaint} size={21} />
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: colors.green,
    tabBarInactiveTintColor: colors.textFaint,
    tabBarStyle: {
      position: 'absolute' as const,
      bottom: Platform.OS === 'ios' ? 28 : 16,
      left: 24,
      right: 24,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.card,
      borderTopWidth: 0,
      paddingBottom: 0,
      paddingTop: 0,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.45 : 0.14,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 8 },
      elevation: 16,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '600' as const,
      marginTop: 0,
    },
    tabBarItemStyle: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      height: 64,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  }), [colors, isDark]);

  return (
    <>
    <DriverNotifListener />
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="saisie"
        options={{
          title: 'Saisie',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Pencil} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: 'Histo.',
          tabBarIcon: ({ focused }) => <TabIcon Icon={History} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="base"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="simulateur"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="moto"
        options={{
          title: 'Moto',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Bike} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Settings} focused={focused} />,
        }}
      />
    </Tabs>
    </>
  );
}
