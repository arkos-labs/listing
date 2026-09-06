import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Database } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useMemo } from 'react';

function TabIcon({ Icon, focused }: { Icon: any; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{
      width: 44, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? '#134024' : 'transparent',
      marginTop: 4,
    }}>
      <Icon size={19} color={focused ? '#fff' : colors.textFaint} strokeWidth={focused ? 2.5 : 1.8} />
    </View>
  );
}

export default function AdminLayout() {
  const { colors, isDark } = useTheme();

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: '#134024',
    tabBarInactiveTintColor: colors.textFaint,
    tabBarStyle: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: Platform.OS === 'ios' ? 24 : 10,
      paddingTop: 4,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.3 : 0.07,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -3 },
      elevation: 8,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const, marginTop: 2 },
  }), [colors, isDark]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon Icon={LayoutDashboard} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="base"
        options={{
          title: 'Base',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Database} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
