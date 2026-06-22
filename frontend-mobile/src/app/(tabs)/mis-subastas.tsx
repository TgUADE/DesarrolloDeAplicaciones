import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { unfavoriteAuction, type Auction } from '@/api/auctions';
import { getStoredUser, isGuestSession } from '@/api/auth';
import { getMyAuctions } from '@/api/users';
import { AuctionCard } from '@/components/ui/auction-card';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';

export default function MisSubastas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    isGuestSession().then((g) => {
      setIsGuest(g);
      if (!g) load();
      else setLoading(false);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await getStoredUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setAuctions(await getMyAuctions(user.id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar tu historial de subastas.'));
    } finally {
      setLoading(false);
    }
  };

  // La estrella en participadas está bloqueada; en favoritas (no participadas) la saca de la lista.
  const handleUnfollow = async (a: Auction) => {
    if (a.participating) return;
    setAuctions((prev) => prev.filter((x) => x.id !== a.id));
    try {
      await unfavoriteAuction(a.id);
    } catch {
      load(); // revertir si falla
    }
  };

  if (isGuest) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
          <Text style={styles.headerTitle}>Mis subastas</Text>
          <Text style={styles.headerSub}>Necesitás una cuenta para ver esto</Text>
        </View>
        <View style={styles.guestWall}>
          <Text style={styles.guestWallTitle}>Función exclusiva</Text>
          <Text style={styles.guestWallMsg}>
            Registrate para poder participar en subastas, guardar favoritos y ver tu historial.
          </Text>
          <Pressable onPress={() => router.replace('/register')} style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.guestBtnText}>Registrarse</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/login')} style={({ pressed }) => [styles.guestBtnSecondary, pressed && { opacity: 0.7 }]}>
            <Text style={styles.guestBtnSecondaryText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Text style={styles.headerTitle}>Mis subastas</Text>
        <Text style={styles.headerSub}>Subastas en las que participaste</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retry}>Reintentar</Text>
            </Pressable>
          </View>
        ) : auctions.length === 0 ? (
          <Text style={styles.empty}>Todavía no participaste en ninguna subasta.</Text>
        ) : (
          auctions.map((a) => (
            <AuctionCard
              key={a.id}
              auction={a}
              onPress={() => router.push({ pathname: '/catalog/[auctionId]', params: { auctionId: a.id } })}
              onToggleStar={() => handleUnfollow(a)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  header: {
    backgroundColor: Brand.primary,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#fff', marginTop: space.sm },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl },
  empty: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', marginTop: space.xl },
  errorBox: { marginTop: space.lg, alignItems: 'center', gap: space.sm },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  guestWall: { flex: 1, padding: space.lg, justifyContent: 'center', alignItems: 'center', gap: space.md },
  guestWallTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Brand.text },
  guestWallMsg: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', lineHeight: 20 },
  guestBtn: { backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 14, paddingHorizontal: space.xl, alignItems: 'center', width: '100%' },
  guestBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  guestBtnSecondary: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, paddingVertical: 12, paddingHorizontal: space.xl, alignItems: 'center', width: '100%' },
  guestBtnSecondaryText: { color: Brand.text, fontSize: FontSize.base, fontWeight: FontWeight.medium },
});
