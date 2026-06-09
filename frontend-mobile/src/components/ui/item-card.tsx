import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@/api/auctions';
import { Brand, FontSize, FontWeight, Radius, Shadow, space } from '@/constants/theme';
import { formatMoney } from '@/utils/format';
import { imageUrl } from '@/utils/media';

/** Tarjeta de ítem del catálogo. `moneda` viene de la subasta. */
export function ItemCard({
  item,
  moneda,
  onPress,
}: {
  item: Item;
  moneda: string;
  onPress?: () => void;
}) {
  const thumb = imageUrl(item.images?.[0]?.url);
  const subtitle =
    item.esObraDeArte && item.artista
      ? `${item.artista}${item.fechaObra ? `, ${item.fechaObra}` : ''}`
      : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.body}>
        <Text style={styles.piece}>Pieza #{item.numeroPieza}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.descripcion}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {item.precioBase != null ? (
          <Text style={styles.price}>{formatMoney(item.precioBase, moneda)}</Text>
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
  pressed: { opacity: 0.85 },
  thumb: {
    width: 100,
    alignSelf: 'stretch',
    minHeight: 100,
    backgroundColor: Brand.bg,
  },
  body: { flex: 1, padding: space.md - 2, gap: 2 },
  piece: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Brand.primary },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  subtitle: { fontSize: FontSize.xs, color: Brand.textMuted },
  price: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.accent, marginTop: 4 },
});
