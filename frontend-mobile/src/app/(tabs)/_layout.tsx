import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { getStoredUser } from '@/api/auth';
import { Brand, FontWeight } from '@/constants/theme';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>;
}

export default function TabsLayout() {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    Promise.all([getStoredUser(), AsyncStorage.getItem('isGuest')]).then(([u, guest]) => {
      if (!u && guest !== 'true') {
        router.replace('/login');
      } else {
        setIsGuest(guest === 'true' && !u);
      }
    });
  }, [router]);

  // En modo invitado los tabs ocultos conservan su flex (actúan de espaciadores)
  // dejando Subastas centrado entre Inicio y Perfil.
  const hiddenTab = { tabBarButton: () => null };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.textMuted,
        tabBarStyle: { backgroundColor: Brand.surface, borderTopColor: Brand.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: FontWeight.medium },
      }}>
      {/* Posición 1 — siempre visible */}
      <Tabs.Screen
        name="home"
        options={{ title: 'Inicio', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }}
      />
      {/* Posición 2 — espaciador izquierdo en modo invitado */}
      <Tabs.Screen
        name="vender"
        options={isGuest ? hiddenTab : { title: 'Vender', tabBarIcon: ({ focused }) => <TabIcon icon="➕" focused={focused} /> }}
      />
      {/* Posición 3 — centro */}
      <Tabs.Screen
        name="mis-subastas"
        options={{ title: 'Subastas', tabBarIcon: ({ focused }) => <TabIcon icon="🔨" focused={focused} /> }}
      />
      {/* Posición 4 — espaciador derecho en modo invitado */}
      <Tabs.Screen
        name="metricas"
        options={isGuest ? hiddenTab : { title: 'Métricas', tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} /> }}
      />
      {/* Posición 5 — siempre visible */}
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
