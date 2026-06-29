import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getStoredUser } from '@/api/auth';
import { requestInsuranceIncrease, listMyInsurances, type MyInsurance } from '@/api/users';
import { Badge } from '@/components/ui/badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';

/** Debe coincidir con PREMIO_RATE del backend (user.service.ts). Solo para previsualizar. */
const PREMIO_RATE = 0.02;

export default function Seguros() {
  const [userId, setUserId] = useState<string | null>(null);
  const [seguros, setSeguros] = useState<MyInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal de aumento de valor
  const [target, setTarget] = useState<MyInsurance | null>(null);
  const [nuevoValor, setNuevoValor] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const me = await getStoredUser();
      if (!me) {
        setLoading(false);
        return;
      }
      setUserId(me.id);
      setSeguros(await listMyInsurances(me.id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar tus seguros.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const monedaDe = (s: MyInsurance) => s.productos[0]?.moneda ?? 'ARS';

  const openIncrease = (s: MyInsurance) => {
    setTarget(s);
    setNuevoValor('');
  };

  // Diferencia de premio a pagar, previsualizada en vivo mientras se escribe.
  const preview = useMemo(() => {
    if (!target) return null;
    const v = Number(nuevoValor);
    if (!Number.isFinite(v) || v <= target.importe) return null;
    const diferenciaValor = v - target.importe;
    return { diferenciaValor, diferenciaPremio: Math.round(diferenciaValor * PREMIO_RATE) };
  }, [target, nuevoValor]);

  const confirmIncrease = async () => {
    if (!target || !userId || !preview) return;
    setSaving(true);
    try {
      const r = await requestInsuranceIncrease(userId, target.nroPoliza, Number(nuevoValor));
      const cur = monedaDe(target);
      setTarget(null);
      await load();
      Alert.alert(
        'Solicitud enviada',
        `Pediste aumentar la póliza ${r.nroPoliza} a ${formatMoney(r.valorSolicitado, cur)}.\n\nDiferencia de premio a pagar: ${formatMoney(r.diferenciaPremio, cur)}.\n\nLa empresa de subastas debe aprobar la solicitud. El valor asegurado no cambia hasta entonces.`,
      );
    } catch (err) {
      Alert.alert('No se pudo enviar la solicitud', getApiErrorMessage(err, 'Intentá nuevamente.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Mis seguros" />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          De cada pieza que entregás para subastar, la empresa contrata un seguro a tu nombre. Una póliza puede
          cubrir varias piezas tuyas. Si querés, podés aumentar el valor asegurado pagando la diferencia del premio.
        </Text>

        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}><Text style={styles.retry}>Reintentar</Text></Pressable>
          </View>
        ) : seguros.length === 0 ? (
          <Text style={styles.empty}>Todavía no tenés pólizas. Entregá una pieza para subastar y aparecerá acá.</Text>
        ) : (
          seguros.map((s) => {
            const cur = monedaDe(s);
            return (
              <View key={s.nroPoliza} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.titleRow}>
                    <Ionicons name="shield-checkmark" size={18} color={Brand.primary} />
                    <Text style={styles.poliza}>{s.nroPoliza}</Text>
                  </View>
                  <Badge label={s.polizaCombinada ? 'Combinada' : 'Individual'} color={s.polizaCombinada ? Brand.accent : Brand.textMuted} />
                </View>

                <Text style={styles.compania}>{s.compania}</Text>

                <View style={styles.valuesRow}>
                  <View style={styles.valueBox}>
                    <Text style={styles.valueLabel}>Valor asegurado</Text>
                    <Text style={styles.valueMain}>{formatMoney(s.importe, cur)}</Text>
                  </View>
                  <View style={styles.valueBox}>
                    <Text style={styles.valueLabel}>Premio estimado</Text>
                    <Text style={styles.valueSub}>{formatMoney(s.premioEstimado, cur)}</Text>
                  </View>
                </View>

                <Text style={styles.piecesTitle}>Piezas cubiertas ({s.productos.length})</Text>
                {s.productos.map((p) => (
                  <View key={p.identificador} style={styles.pieceRow}>
                    <Ionicons name="cube-outline" size={13} color={Brand.textMuted} />
                    <Text style={styles.pieceText} numberOfLines={1}>
                      {p.descripcionCompleta}
                    </Text>
                  </View>
                ))}

                {s.solicitudPendiente ? (
                  <View style={styles.pendingBox}>
                    <Ionicons name="time-outline" size={15} color={Brand.warning} />
                    <Text style={styles.pendingText}>
                      Solicitud pendiente: aumentar a {formatMoney(s.solicitudPendiente.valorSolicitado, cur)} (premio +{formatMoney(s.solicitudPendiente.diferenciaPremio, cur)}). Esperando aprobación de la empresa.
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => openIncrease(s)}
                    style={({ pressed }) => [styles.increaseBtn, pressed && styles.dim]}>
                    <Ionicons name="trending-up" size={16} color="#fff" />
                    <Text style={styles.increaseText}>Solicitar aumento de valor</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal: aumentar valor asegurado */}
      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={() => !saving && setTarget(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Solicitar aumento de valor</Text>
            {target ? (
              <>
                <Text style={styles.modalSub}>
                  {target.nroPoliza} · {target.compania}
                </Text>
                <Text style={styles.modalActual}>
                  Valor actual: {formatMoney(target.importe, monedaDe(target))}
                </Text>

                <Text style={styles.label}>Nuevo valor asegurado ({monedaDe(target)})</Text>
                <TextInput
                  style={styles.input}
                  value={nuevoValor}
                  onChangeText={setNuevoValor}
                  keyboardType="numeric"
                  placeholder={`Mayor a ${target.importe}`}
                  placeholderTextColor={Brand.placeholder}
                />

                {preview ? (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewLine}>
                      Aumento de cobertura: {formatMoney(preview.diferenciaValor, monedaDe(target))}
                    </Text>
                    <Text style={styles.previewPremio}>
                      Diferencia de premio a pagar: {formatMoney(preview.diferenciaPremio, monedaDe(target))}
                    </Text>
                  </View>
                ) : nuevoValor.length > 0 ? (
                  <Text style={styles.hint}>Ingresá un valor mayor al actual.</Text>
                ) : null}

                <Text style={styles.modalNote}>
                  El aumento queda sujeto a aprobación de la empresa. El valor asegurado no cambia hasta que la solicitud sea aceptada.
                </Text>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setTarget(null)}
                    disabled={saving}
                    style={({ pressed }) => [styles.cancelBtn, pressed && styles.dim]}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmIncrease}
                    disabled={!preview || saving}
                    style={({ pressed }) => [styles.confirmBtn, (!preview || saving) && styles.btnDisabled, pressed && styles.dim]}>
                    <Text style={styles.confirmText}>{saving ? 'Enviando…' : 'Enviar solicitud'}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  body: { padding: space.lg, paddingBottom: space.xl },
  intro: { fontSize: FontSize.sm, color: Brand.textMuted, lineHeight: 19, marginBottom: space.md },
  center: { alignItems: 'center', marginTop: space.xl, gap: space.sm },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium },
  empty: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', marginTop: space.xl, lineHeight: 20 },

  card: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md, marginBottom: space.md, gap: space.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  poliza: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.text },
  compania: { fontSize: FontSize.sm, color: Brand.textMuted },
  valuesRow: { flexDirection: 'row', gap: space.sm, marginTop: 2 },
  valueBox: { flex: 1, backgroundColor: Brand.bg, borderRadius: Radius.sm, padding: space.sm },
  valueLabel: { fontSize: FontSize.xs, color: Brand.textMuted },
  valueMain: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.accent },
  valueSub: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.text },
  piecesTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text, marginTop: space.sm },
  pieceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pieceText: { flex: 1, fontSize: FontSize.sm, color: Brand.textMuted },
  increaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 11, marginTop: space.sm },
  increaseText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  pendingBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Brand.bg, borderRadius: Radius.sm, padding: space.sm, marginTop: space.sm },
  pendingText: { flex: 1, fontSize: FontSize.xs, color: Brand.text, lineHeight: 17 },
  modalNote: { fontSize: FontSize.xs, color: Brand.textMuted, lineHeight: 16, marginTop: space.xs },

  kav: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: space.lg },
  modal: { backgroundColor: Brand.surface, borderRadius: Radius.md, padding: space.lg, gap: space.sm },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Brand.text },
  modalSub: { fontSize: FontSize.sm, color: Brand.textMuted },
  modalActual: { fontSize: FontSize.sm, color: Brand.text, fontWeight: FontWeight.medium },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text, marginTop: space.sm },
  input: { backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, paddingHorizontal: space.md, paddingVertical: 11, color: Brand.text, fontSize: FontSize.base },
  previewBox: { backgroundColor: Brand.bg, borderRadius: Radius.sm, padding: space.sm, gap: 2, marginTop: 2 },
  previewLine: { fontSize: FontSize.sm, color: Brand.textMuted },
  previewPremio: { fontSize: FontSize.sm, color: Brand.accent, fontWeight: FontWeight.bold },
  hint: { fontSize: FontSize.xs, color: Brand.danger, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: Brand.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  confirmBtn: { flex: 1, backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  btnDisabled: { opacity: 0.5 },
  dim: { opacity: 0.7 },
});
