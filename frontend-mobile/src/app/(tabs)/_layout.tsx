import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ColorValue } from 'react-native';

import { getStoredUser } from '@/api/auth';
import { Brand, FontWeight } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Relleno cuando está activo, contorno cuando no. Usa el color del tab (tint activo/inactivo).
function TabIcon({ name, focused, color }: { name: IoniconName; focused: boolean; color: ColorValue }) {
  const icon = (focused ? name : (`${name}-outline` as IoniconName));
  return <Ionicons name={icon} size={24} color={color} />;
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
        options={{ title: 'Inicio', tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} /> }}
      />
      {/* Posición 2 — espaciador izquierdo en modo invitado */}
      <Tabs.Screen
        name="vender"
        options={isGuest ? hiddenTab : { title: 'Vender', tabBarIcon: ({ focused, color }) => <TabIcon name="add-circle" focused={focused} color={color} /> }}
      />
      {/* Posición 3 — centro */}
      <Tabs.Screen
        name="mis-subastas"
        options={{ title: 'Subastas', tabBarIcon: ({ focused, color }) => <TabIcon name="hammer" focused={focused} color={color} /> }}
      />
      {/* Posición 4 — espaciador derecho en modo invitado */}
      <Tabs.Screen
        name="metricas"
        options={isGuest ? hiddenTab : { title: 'Métricas', tabBarIcon: ({ focused, color }) => <TabIcon name="stats-chart" focused={focused} color={color} /> }}
      />
      {/* Posición 5 — siempre visible */}
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ focused, color }) => <TabIcon name="person" focused={focused} color={color} /> }}
      />
    </Tabs>
  );
}
