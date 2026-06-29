import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getItem, type Item } from '@/api/auctions';
import { isGuestSession } from '@/api/auth';
import { Badge } from '@/components/ui/badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { imageUrl } from '@/utils/media';

/**
 * Detalle de la pieza (versión básica, read-only).
 * TODO: integrar puja en vivo vía WebSockets (oferta actual, historial, pujar).
 */
export default function DetallePieza() {
  const router = useRouter();
  const { itemId, moneda } = useLocalSearchParams<{ itemId: string; moneda?: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    isGuestSession().then(setIsGuest);
    if (itemId) load();
  }, [itemId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItem(await getItem(itemId));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar la pieza.'));
    } finally {
      setLoading(false);
    }
  };

  const cur = moneda ?? '';
  const cover = imageUrl(item?.images?.[0]?.url);
  const pujaMin = item?.precioBase != null ? Number(item.precioBase) * 1.01 : null;

  const goLive = () => {
    if (item?.auctionId) {
      router.push({ pathname: '/live/[auctionId]', params: { auctionId: item.auctionId } });
    } else {
      Alert.alert('No disponible', 'Esta pieza no está asignada a una subasta en curso.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Detalle de la pieza" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xl }}>
        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retry}>Reintentar</Text>
            </Pressable>
          </View>
        ) : item ? (
          <>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={150} />
            ) : (
              <View style={styles.cover} />
            )}

            <View style={styles.content}>
              <Badge label="Pieza" color={Brand.primary} />
              <Text style={styles.title}>{item.descripcion}</Text>

              {isGuest ? (
                <Pressable onPress={() => router.replace('/login')} style={styles.guestPriceBanner}>
                  <Text style={styles.guestPriceText}>🔒 Registrate para ver el precio base</Text>
                </Pressable>
              ) : item.precioBase != null ? (
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Precio base</Text>
                    <Text style={[styles.statValue, { color: Brand.accent }]}>
                      {formatMoney(item.precioBase, cur)}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Puja mín.</Text>
                    <Text style={[styles.statValue, { color: Brand.primary }]}>
                      {formatMoney(pujaMin, cur)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {item.esObraDeArte && item.artista ? (
                <Section title="Artista">
                  {item.artista}
                  {item.fechaObra ? ` · ${item.fechaObra}` : ''}
                </Section>
              ) : null}
              {item.historia ? <Section title="Historia">{item.historia}</Section> : null}
              <Section title="Descripción">
                {item.descripcionElementos ?? item.descripcion}
                {item.cantidadElementos > 1 ? `\n(${item.cantidadElementos} elementos)` : ''}
              </Section>

              {isGuest ? (
                <Pressable onPress={() => router.replace('/login')} style={[styles.cta, { backgroundColor: Brand.accent }]}>
                  <Text style={styles.ctaText}>Registrate para participar</Text>
                </Pressable>
              ) : item.isCurrent ? (
                <Pressable onPress={goLive} style={({ pressed }) => [styles.cta, pressed && styles.dim]}>
                  <Text style={styles.ctaText}>Ver en subasta en vivo</Text>
                </Pressable>
              ) : (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>
                    {item.auctionStatus === 'abierta'
                      ? '⏳ Este ítem todavía no se está subastando. Va a salir a remate cuando termine la pieza actual.'
                      : item.auctionStatus === 'programada'
                        ? '🗓️ Esta subasta todavía no comenzó. Vas a poder pujar cuando empiece.'
                        : 'Este ítem no se está subastando en este momento.'}
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  cover: { height: 260, backgroundColor: Brand.primaryDark },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Brand.text },
  statsRow: { flexDirection: 'row', gap: space.md, marginVertical: space.sm },
  statCard: {
    flex: 1,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    padding: space.md,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: { fontSize: FontSize.xs, color: Brand.textMuted },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  section: { marginTop: space.sm, gap: 4 },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text },
  sectionBody: { fontSize: FontSize.sm, color: Brand.textMuted, lineHeight: 20 },
  cta: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: space.lg,
  },
  ctaText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  dim: { opacity: 0.85 },
  notice: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, padding: space.md, marginTop: space.lg },
  noticeText: { fontSize: FontSize.sm, color: Brand.textMuted, lineHeight: 20, textAlign: 'center' },
  errorBox: { marginTop: space.xl, alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  guestPriceBanner: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
    marginVertical: space.sm,
  },
  guestPriceText: { fontSize: FontSize.sm, color: Brand.primary, fontWeight: FontWeight.medium },
});
