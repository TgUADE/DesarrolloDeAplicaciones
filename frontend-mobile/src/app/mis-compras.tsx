import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStoredUser } from '@/api/auth';
import { listPurchases, retirePurchase, type Purchase } from '@/api/purchases';
import { Badge } from '@/components/ui/badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';

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
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
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
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRetire = (p: Purchase) => {
    Alert.alert(
      'Retirar personalmente',
      'Si retirás el bien personalmente perdés la cobertura del seguro. ¿Confirmás?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            setBusy(p.identificador);
            try {
              await retirePurchase(p.identificador);
              await load();
            } catch (err) {
              Alert.alert('Error', getApiErrorMessage(err, 'No se pudo registrar el retiro.'));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const total = (p: Purchase) => Number(p.importe) + Number(p.comision) + Number(p.costoEnvio ?? 0);

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
            return (
              <View key={p.identificador} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.title} numberOfLines={1}>
                    {p.producto?.descripcionCompleta ?? `Pieza #${p.producto?.numeroPieza ?? p.identificador}`}
                  </Text>
                  <Badge label={meta.label} color={meta.color} />
                </View>

                <View style={styles.line}><Text style={styles.lbl}>Oferta</Text><Text style={styles.val}>{formatMoney(p.importe, cur)}</Text></View>
                <View style={styles.line}><Text style={styles.lbl}>Comisiones</Text><Text style={styles.val}>{formatMoney(p.comision, cur)}</Text></View>
                <View style={styles.line}><Text style={styles.lbl}>Envío</Text><Text style={styles.val}>{p.retiraPersonalmente ? 'Retiro personal' : formatMoney(p.costoEnvio ?? 0, cur)}</Text></View>
                <View style={[styles.line, styles.totalLine]}><Text style={styles.totalLbl}>Total a pagar</Text><Text style={styles.totalVal}>{formatMoney(total(p), cur)}</Text></View>

                <View style={styles.deposito}>
                  <Text style={styles.depTitle}>📦 Dónde retirar</Text>
                  <Text style={styles.depText}>{p.producto?.deposito ?? 'A confirmar'}{p.producto?.ubicacion ? ` · ${p.producto.ubicacion}` : ''}</Text>
                  {p.producto?.seguro ? <Text style={styles.depText}>🛡 Póliza {p.producto.seguro.nroPoliza}</Text> : null}
                </View>

                {!p.retiraPersonalmente && p.status !== 'derivado_justicia' ? (
                  <Pressable onPress={() => onRetire(p)} disabled={busy === p.identificador} style={({ pressed }) => [styles.retireBtn, (pressed || busy === p.identificador) && styles.dim]}>
                    <Text style={styles.retireText}>{busy === p.identificador ? '...' : 'Retirar personalmente'}</Text>
                  </Pressable>
                ) : p.retiraPersonalmente ? (
                  <Text style={styles.retiradoNote}>✓ Marcado para retiro personal (sin cobertura de seguro)</Text>
                ) : null}
              </View>
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
  card: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md, marginBottom: space.md, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  title: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.text },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lbl: { fontSize: FontSize.sm, color: Brand.textMuted },
  val: { fontSize: FontSize.sm, color: Brand.text },
  totalLine: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: Brand.border },
  totalLbl: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.text },
  totalVal: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.accent },
  deposito: { marginTop: space.sm, backgroundColor: Brand.bg, borderRadius: Radius.sm, padding: space.sm },
  depTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Brand.text },
  depText: { fontSize: FontSize.xs, color: Brand.textMuted, marginTop: 2 },
  retireBtn: { marginTop: space.sm, borderWidth: 1, borderColor: Brand.danger, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  retireText: { color: Brand.danger, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  retiradoNote: { marginTop: space.sm, fontSize: FontSize.xs, color: Brand.textMuted, fontStyle: 'italic' },
  dim: { opacity: 0.6 },
});
