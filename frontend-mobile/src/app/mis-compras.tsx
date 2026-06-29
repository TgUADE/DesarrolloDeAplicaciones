import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStoredUser } from '@/api/auth';
import { listPurchases, type Purchase } from '@/api/purchases';
import { Badge } from '@/components/ui/badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { imageUrl } from '@/utils/media';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', color: Brand.warning },
  pagado: { label: 'Pagado', color: Brand.success },
  multa_aplicada: { label: 'Multa aplicada', color: Brand.danger },
  derivado_justicia: { label: 'Derivado a justicia', color: Brand.danger },
};

export default function MisCompras() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const me = await getStoredUser();
      if (!me) {
        router.replace('/login');
        return;
      }
      setPurchases(await listPurchases(me.id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar tus compras.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = (p: Purchase) => Number(p.importe) + Number(p.comision) + (p.retiraPersonalmente ? 0 : Number(p.costoEnvio ?? 0)) + Number(p.multa ?? 0);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Mis compras" />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}><Text style={styles.retry}>Reintentar</Text></Pressable>
          </View>
        ) : purchases.length === 0 ? (
          <Text style={styles.empty}>Todavía no ganaste ninguna subasta.</Text>
        ) : (
          purchases.map((p) => {
            const meta = STATUS_META[p.status] ?? { label: p.status, color: Brand.textMuted };
            const cur = p.moneda ?? 'ARS';
            const cover = imageUrl(p.producto?.fotos?.[0]?.url ?? undefined);
            return (
              <Pressable
                key={p.identificador}
                onPress={() => router.push(`/purchase/${p.identificador}`)}
                style={({ pressed }) => [styles.card, pressed && styles.dim]}>
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}><Ionicons name="image-outline" size={20} color={Brand.textMuted} /></View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.title} numberOfLines={1}>
                      {p.producto?.descripcionCompleta ?? 'Pieza adquirida'}
                    </Text>
                    <Badge label={meta.label} color={meta.color} />
                  </View>
                  <Text style={styles.factura}>{p.facturaNro ?? `Compra #${p.identificador}`}</Text>
                  <View style={styles.rowBetween}>
                    <Text style={styles.totalVal}>{formatMoney(total(p), cur)}</Text>
                    <View style={styles.verRow}>
                      <Text style={styles.verText}>Ver resumen</Text>
                      <Ionicons name="chevron-forward" size={16} color={Brand.primary} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  body: { padding: space.lg, paddingBottom: space.xl },
  center: { alignItems: 'center', marginTop: space.xl, gap: space.sm },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium },
  empty: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', marginTop: space.xl },
  card: { flexDirection: 'row', gap: space.md, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md, marginBottom: space.sm + 2 },
  thumb: { width: 60, height: 60, borderRadius: Radius.sm, backgroundColor: Brand.bg },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3, justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  title: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.text },
  factura: { fontSize: FontSize.xs, color: Brand.textMuted },
  totalVal: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.accent },
  verRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verText: { fontSize: FontSize.xs, color: Brand.primary, fontWeight: FontWeight.medium },
  dim: { opacity: 0.7 },
});
