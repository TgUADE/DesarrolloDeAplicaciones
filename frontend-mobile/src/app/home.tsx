import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getStoredUser, logout, type AuthUser } from '@/api/auth';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

/* Placeholder post-login. Acá irá la lista de Subastas más adelante. */
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Sesión iniciada ✅</Text>
        {user && (
          <Text style={styles.sub}>
            {user.nombre} {user.apellido}
            {'\n'}
            {user.email}
          </Text>
        )}
        <Text style={styles.note}>Pantalla provisoria. Acá va a ir la lista de Subastas.</Text>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
          <Text style={styles.btnText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.pageBg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Brand.text },
  sub: { fontSize: FontSize.base, color: Brand.text, textAlign: 'center' },
  note: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', marginTop: space.sm },
  btn: {
    backgroundColor: Brand.danger,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: space.xl,
    marginTop: space.lg,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: Brand.textOnPrimary, fontSize: FontSize.base, fontWeight: FontWeight.medium },
});
