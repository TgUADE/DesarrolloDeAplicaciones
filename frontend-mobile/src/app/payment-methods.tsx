import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStoredUser, isGuestSession } from '@/api/auth';
import { listPaymentMethods, removePaymentMethod, type PaymentMethod } from '@/api/payment-methods';
import { Badge } from '@/components/ui/badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';

const ESTADO_META: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente de validación', color: Brand.warning },
  aprobada: { label: 'Aprobada', color: Brand.success },
  rechazada: { label: 'Rechazada', color: Brand.danger },
};

const TYPE_LABEL: Record<string, string> = {
  cuenta_bancaria_nacional: 'Cuenta bancaria nacional',
  cuenta_bancaria_extranjera: 'Cuenta bancaria extranjera',
  tarjeta_credito_nacional: 'Tarjeta de crédito',
  tarjeta_credito_internacional: 'Tarjeta internacional',
  cheque_certificado: 'Cheque certificado',
};

const iconFor = (tipo: string) =>
  tipo.startsWith('tarjeta') ? 'card-outline' : tipo === 'cheque_certificado' ? 'document-text-outline' : 'business-outline';

function datos(pm: PaymentMethod): string {
  if (pm.tipo.startsWith('tarjeta')) return `${pm.banco ?? ''} ···· ${pm.numeroTarjeta ?? ''}`.trim();
  if (pm.tipo === 'cheque_certificado') return `Garantía: ${pm.montoGarantia ?? '—'}`;
  return `${pm.banco ?? ''}${pm.numeroCuenta ? ` · ${pm.numeroCuenta}` : ''}`.trim() || '—';
}

export default function MediosDePago() {
  const router = useRouter();
  const [pms, setPms] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      if (await isGuestSession()) {
        router.replace('/login');
        return;
      }
      const me = await getStoredUser();
      if (!me) {
        router.replace('/login');
        return;
      }
      setUserId(me.id);
      setPms(await listPaymentMethods(me.id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar tus medios de pago.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRemove = (pm: PaymentMethod) => {
    if (!userId) return;
    Alert.alert('Eliminar medio de pago', '¿Querés dar de baja este medio de pago?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setBusy(pm.id);
          try {
            await removePaymentMethod(userId, pm.id);
            await load();
          } catch (err) {
            Alert.alert('Error', getApiErrorMessage(err, 'No se pudo eliminar.'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Medios de pago" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}><Text style={styles.retry}>Reintentar</Text></Pressable>
          </View>
        ) : pms.length === 0 ? (
          <Text style={styles.empty}>Todavía no cargaste medios de pago. Necesitás al menos uno verificado para poder pujar.</Text>
        ) : (
          pms.map((pm) => {
            const meta = ESTADO_META[pm.estado] ?? { label: pm.estado, color: Brand.textMuted };
            return (
              <View key={pm.id} style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name={iconFor(pm.tipo) as any} size={22} color={Brand.primary} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{TYPE_LABEL[pm.tipo] ?? pm.tipo}</Text>
                    <Badge label={meta.label} color={meta.color} />
                  </View>
                  <Text style={styles.cardDatos} numberOfLines={1}>{datos(pm)}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardMoneda}>{pm.moneda === 'AMBAS' ? 'ARS + USD' : pm.moneda}</Text>
                    <Pressable onPress={() => onRemove(pm)} disabled={busy === pm.id} hitSlop={8}>
                      <Text style={styles.removeText}>{busy === pm.id ? '...' : 'Eliminar'}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push({ pathname: '/add-payment-method', params: { return: 'list' } })}
          style={({ pressed }) => [styles.addBtn, pressed && styles.dim]}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Agregar método de pago</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  scroll: { flex: 1 },
  body: { padding: space.lg, paddingBottom: space.xl },
  center: { alignItems: 'center', marginTop: space.xl, gap: space.sm },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium },
  empty: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', marginTop: space.xl, lineHeight: 20, paddingHorizontal: space.md },
  card: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    padding: space.md,
    marginBottom: space.sm + 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: `${Brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  cardTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.text },
  cardDatos: { fontSize: FontSize.xs, color: Brand.textMuted },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  cardMoneda: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Brand.textMuted },
  removeText: { fontSize: FontSize.xs, color: Brand.danger, fontWeight: FontWeight.medium },
  footer: {
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    backgroundColor: Brand.pageBg,
  },
  addBtn: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  dim: { opacity: 0.85 },
});
