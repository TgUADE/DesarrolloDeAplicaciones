import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@/api/auctions';
import { Badge } from '@/components/ui/badge';
import { Brand, FontSize, FontWeight, Radius, Shadow, space } from '@/constants/theme';
import { formatMoney } from '@/utils/format';
import { imageUrl } from '@/utils/media';

/** Tarjeta de ítem del catálogo. `moneda` viene de la subasta; `currentItemId` marca el "En vivo". */
export function ItemCard({
  item,
  moneda,
  currentItemId,
  onPress,
}: {
  item: Item;
  moneda: string;
  currentItemId?: string | null;
  onPress?: () => void;
}) {
  const thumb = imageUrl(item.images?.[0]?.url);
  const subtitle =
    item.esObraDeArte && item.artista
      ? `${item.artista}${item.fechaObra ? `, ${item.fechaObra}` : ''}`
      : null;

  const sold = item.status === 'vendido';
  const isLive = !sold && currentItemId === item.id;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, sold && styles.cardSold, pressed && styles.pressed]}>
      {thumb ? (
        <Image
          source={{ uri: thumb }}
          style={[styles.thumb, sold && styles.thumbSold]}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.piece}>Pieza #{item.numeroPieza}</Text>
          {sold ? (
            <Badge label="Subastado" color={Brand.textMuted} />
          ) : isLive ? (
            <Badge label="En vivo" color={Brand.danger} />
          ) : null}
        </View>
        <Text style={[styles.title, sold && styles.dimText]} numberOfLines={2}>
          {item.descripcion}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {item.precioBase != null ? (
          <Text style={[styles.price, sold && styles.dimText]}>{formatMoney(item.precioBase, moneda)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: space.sm + 2,
    ...Shadow.card,
  },
  cardSold: { backgroundColor: Brand.bg },
  pressed: { opacity: 0.85 },
  thumb: { width: 100, alignSelf: 'stretch', minHeight: 100, backgroundColor: Brand.bg },
  thumbSold: { opacity: 0.5 },
  body: { flex: 1, padding: space.md - 2, gap: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  piece: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Brand.primary },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  subtitle: { fontSize: FontSize.xs, color: Brand.textMuted },
  price: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.accent, marginTop: 4 },
  dimText: { color: Brand.textMuted },
});
