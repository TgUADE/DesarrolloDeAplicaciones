import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Auction } from '@/api/auctions';
import { Badge } from '@/components/ui/badge';
import { categoryMeta } from '@/constants/categories';
import { Brand, FontSize, FontWeight, Radius, Shadow, space } from '@/constants/theme';
import { formatDate } from '@/utils/format';
import { imageUrl } from '@/utils/media';

/** Tarjeta de subasta para los listados (Home "Próximas", Mis subastas). */
export function AuctionCard({ auction, onPress }: { auction: Auction; onPress?: () => void }) {
  const cat = categoryMeta(auction.categoria);
  const cover = imageUrl(auction.items?.[0]?.images?.[0]?.url);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {auction.titulo}
        </Text>
        <Text style={styles.meta}>
          {formatDate(auction.fechaHora)} · {auction.moneda}
        </Text>
      </View>
      <Badge label={cat.label} color={cat.color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    padding: space.md - 2,
    marginBottom: space.sm + 2,
    ...Shadow.card,
  },
  pressed: { opacity: 0.85 },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: Brand.bg,
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text },
  meta: { fontSize: FontSize.xs, color: Brand.textMuted },
});
