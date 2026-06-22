import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Socket } from 'socket.io-client';

import { getAuction, getCatalog, type Auction, type Item } from '@/api/auctions';
import { createAuctionSocket } from '@/api/socket';
import { Badge } from '@/components/ui/badge';
import { ItemCard } from '@/components/ui/item-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { auctionStatusMeta, categoryMeta } from '@/constants/categories';
import { Brand, FontSize, FontWeight, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';

export default function Catalogo() {
  const router = useRouter();
  const { auctionId } = useLocalSearchParams<{ auctionId: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [a, its] = await Promise.all([getAuction(auctionId), getCatalog(auctionId)]);
      setAuction(a);
      setItems(its);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar el catálogo.'));
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  // Recargar al entrar o volver a la pantalla.
  useFocusEffect(useCallback(() => { if (auctionId) load(); }, [auctionId, load]));

  // Actualización en vivo: escuchar avances de la subasta (sin registrarse como postor).
  useEffect(() => {
    if (!auctionId) return;
    let active = true;
    (async () => {
      try {
        const s = await createAuctionSocket();
        socketRef.current = s;
        const reload = () => { if (active) load(); };
        s.on('connect', () => s.emit('watch', { auctionId }));
        s.on('item:sold', reload);
        s.on('auction:item-changed', reload);
        s.connect();
      } catch {
        // sin sesión / sin token: el catálogo se ve igual, sin actualización en vivo
      }
    })();
    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [auctionId, load]);

  const cat = auction ? categoryMeta(auction.categoria) : null;
  const status = auction ? auctionStatusMeta(auction.status) : null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Catálogo" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retry}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {auction ? (
              <View style={styles.summary}>
                <Text style={styles.title}>{auction.titulo}</Text>
                <View style={styles.badges}>
                  {status ? <Badge label={status.label} color={status.color} /> : null}
                  {cat ? <Badge label={cat.label} color={cat.color} /> : null}
                </View>
                <Text style={styles.meta}>
                  {items.length} {items.length === 1 ? 'pieza' : 'piezas'} ·{' '}
                  {formatDate(auction.fechaHora)} · {auction.moneda}
                </Text>
              </View>
            ) : null}

            {items.length === 0 ? (
              <Text style={styles.empty}>Esta subasta todavía no tiene piezas cargadas.</Text>
            ) : (
              items.map((item) => {
                const isCurrent = auction?.currentItemId != null && String(auction.currentItemId) === String(item.id);
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    moneda={auction?.moneda ?? ''}
                    currentItemId={auction?.currentItemId}
                    onPress={() =>
                      isCurrent && auction?.status === 'abierta'
                        ? router.push({ pathname: '/live/[auctionId]', params: { auctionId } })
                        : router.push({ pathname: '/item/[itemId]', params: { itemId: item.id, moneda: auction?.moneda ?? '' } })
                    }
                  />
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xl },
  summary: { marginBottom: space.md, gap: space.sm },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Brand.text },
  badges: { flexDirection: 'row', gap: space.sm },
  meta: { fontSize: FontSize.xs, color: Brand.textMuted },
  empty: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', marginTop: space.xl },
  errorBox: { marginTop: space.lg, alignItems: 'center', gap: space.sm },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
});
