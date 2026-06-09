import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { getStoredUser } from '@/api/auth';
import { Brand, FontWeight } from '@/constants/theme';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>;
}

/** Navegador de pestañas del usuario logueado (Inicio / Subastas / Vender / Métricas / Perfil). */
export default function TabsLayout() {
  const router = useRouter();

  // Guard simple: sin sesión guardada, volver al login.
  useEffect(() => {
    getStoredUser().then((u) => {
      if (!u) router.replace('/login');
    });
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.textMuted,
        tabBarStyle: { backgroundColor: Brand.surface, borderTopColor: Brand.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: FontWeight.medium },
      }}>
      <Tabs.Screen
        name="home"
        options={{ title: 'Inicio', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="mis-subastas"
        options={{ title: 'Subastas', tabBarIcon: ({ focused }) => <TabIcon icon="🔨" focused={focused} /> }}
      />
      <Tabs.Screen
        name="vender"
        options={{ title: 'Vender', tabBarIcon: ({ focused }) => <TabIcon icon="➕" focused={focused} /> }}
      />
      <Tabs.Screen
        name="metricas"
        options={{ title: 'Métricas', tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
