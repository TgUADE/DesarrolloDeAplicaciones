import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredUser, isGuestSession, logout, type AuthUser } from '@/api/auth';
import { Badge } from '@/components/ui/badge';
import { categoryMeta } from '@/constants/categories';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

export default function Perfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    getStoredUser().then(setUser);
    isGuestSession().then(setIsGuest);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const initials = user ? `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase() : '';
  const cat = categoryMeta(user?.categoria);

  if (isGuest) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + space.lg }]}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color="#ffffff" />
          </View>
          <Text style={styles.name}>Invitado</Text>
          <Text style={styles.email}>Navegando sin cuenta</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.guestMsg}>
            Creá una cuenta para pujar en subastas, guardar favoritos, ver tus métricas y vender artículos.
          </Text>
          <Pressable
            onPress={() => router.replace('/register')}
            style={({ pressed }) => [styles.registerBtn, pressed && styles.dim]}>
            <Text style={styles.registerBtnText}>Registrarse</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/login')}
            style={({ pressed }) => [styles.loginBtn, pressed && styles.dim]}>
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
          onPress={() => router.push('/perfil-datos')}
          style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}>
          <View style={styles.menuLeft}>
            <Ionicons name="person-outline" size={20} color={Brand.text} />
            <Text style={styles.menuText}>Datos de perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/mis-compras')}
          style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}>
          <View style={styles.menuLeft}>
            <Ionicons name="receipt-outline" size={20} color={Brand.text} />
            <Text style={styles.menuText}>Mis compras</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/payment-methods')}
          style={({ pressed }) => [styles.menuItem, pressed && styles.dim]}>
          <View style={styles.menuLeft}>
            <Ionicons name="card-outline" size={20} color={Brand.text} />
            <Text style={styles.menuText}>Medios de pago</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} />
        </Pressable>

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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    marginBottom: space.md,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  menuText: { color: Brand.text, fontSize: FontSize.base, fontWeight: FontWeight.medium },
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
  guestMsg: {
    fontSize: FontSize.sm,
    color: Brand.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: space.lg,
  },
  registerBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: space.md,
  },
  registerBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  loginBtn: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginBtnText: { color: Brand.text, fontSize: FontSize.base, fontWeight: FontWeight.medium },
});
