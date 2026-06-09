import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredUser, logout, type AuthUser } from '@/api/auth';
import { Badge } from '@/components/ui/badge';
import { categoryMeta } from '@/constants/categories';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

export default function Perfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initials = user ? `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase() : '';
  const cat = categoryMeta(user?.categoria);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.lg }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>
          {user?.nombre} {user?.apellido}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user ? <Badge label={`Categoría: ${cat.label}`} color={cat.color} /> : null}
      </View>

      <View style={styles.body}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.dim]}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  header: {
    backgroundColor: Brand.primary,
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.xl },
  name: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff' },
  email: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  body: { padding: space.lg },
  logoutBtn: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.danger,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: Brand.danger, fontSize: FontSize.base, fontWeight: FontWeight.medium },
  dim: { opacity: 0.7 },
});
