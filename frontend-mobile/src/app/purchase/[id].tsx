import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPurchaseById, invoiceUrl, retirePurchase, sendInvoiceByMail, type Purchase } from '@/api/purchases';
import { Badge } from '@/components/ui/badge';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDate, formatMoney } from '@/utils/format';
import { imageUrl } from '@/utils/media';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', color: Brand.warning },
  pagado: { label: 'Pagado', color: Brand.success },
  multa_aplicada: { label: 'Multa aplicada', color: Brand.danger },
  derivado_justicia: { label: 'Derivado a justicia', color: Brand.danger },
};

const TIPO_LABEL: Record<string, string> = {
  cuenta_bancaria_nacional: 'Cuenta bancaria',
  cuenta_bancaria_extranjera: 'Cuenta bancaria (ext.)',
  tarjeta_credito_nacional: 'Tarjeta de crédito',
  tarjeta_credito_internacional: 'Tarjeta internacional',
  cheque_certificado: 'Cheque certificado',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ResumenCompra() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setP(await getPurchaseById(id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar la compra.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openInvoice = async () => {
    try {
      await openBrowserAsync(await invoiceUrl(id));
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo abrir la factura.'));
    }
  };

  const sendInvoice = async () => {
    setBusy('mail');
    try {
      const r = await sendInvoiceByMail(id);
      Alert.alert('Factura enviada', `Te enviamos la factura a ${r.to}.`);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo enviar la factura.'));
    } finally {
      setBusy(null);
    }
  };

  const onRetire = () => {
    Alert.alert('Retirar personalmente', 'Si retirás el bien personalmente perdés la cobertura del seguro. ¿Confirmás?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          setBusy('retire');
          try {
            await retirePurchase(Number(id));
            await load();
          } catch (err) {
            Alert.alert('Error', getApiErrorMessage(err, 'No se pudo registrar el retiro.'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScreenHeader title="Resumen de compra" />
        <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
      </View>
    );
  }

  if (error || !p) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScreenHeader title="Resumen de compra" />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Compra no encontrada.'}</Text>
          <Pressable onPress={load}><Text style={styles.retry}>Reintentar</Text></Pressable>
        </View>
      </View>
    );
  }

  const cur = p.moneda ?? 'ARS';
  const meta = STATUS_META[p.status] ?? { label: p.status, color: Brand.textMuted };
  const importe = Number(p.importe ?? 0);
  const comision = Number(p.comision ?? 0);
  const envio = p.retiraPersonalmente ? 0 : Number(p.costoEnvio ?? 0);
  const multa = Number(p.multa ?? 0);
  const total = importe + comision + envio + multa;
  const cover = imageUrl(p.producto?.fotos?.[0]?.url ?? undefined);
  const medio = p.medioPago ? `${TIPO_LABEL[p.medioPago.tipo] ?? p.medioPago.tipo} · ${p.medioPago.banco ?? ''} (${p.medioPago.moneda})` : null;
  const paid = p.status === 'pagado';
  const envioStatus = p.envioEstado ?? 'pendiente';
  const steps = [
    { label: 'Compra registrada', done: true },
    { label: 'Pago confirmado', done: paid },
    { label: 'Enviado por la empresa', done: envioStatus === 'enviado' || envioStatus === 'recibido' },
    { label: 'Recibido', done: envioStatus === 'recibido' },
  ];
  const ENVIO_LABEL: Record<string, string> = { pendiente: paid ? 'Preparando envío' : 'Pendiente de pago', enviado: 'En camino', recibido: 'Entregado' };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Resumen de compra" />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Detalles de la factura */}
        <Section title="Detalles de la factura">
          <View style={styles.rowBetween}>
            <Text style={styles.facturaNro}>{p.facturaNro ?? `#${p.identificador}`}</Text>
            <Badge label={meta.label} color={meta.color} />
          </View>
          {p.createdAt ? <Text style={styles.muted}>Emitida el {formatDate(p.createdAt)}</Text> : null}
        </Section>

        {/* Pieza adquirida */}
        <Section title="Pieza adquirida">
          <View style={styles.pieceRow}>
            {cover ? <Image source={{ uri: cover }} style={styles.pieceImg} contentFit="cover" /> : <View style={[styles.pieceImg, styles.pieceImgEmpty]}><Ionicons name="image-outline" size={22} color={Brand.textMuted} /></View>}
            <View style={{ flex: 1 }}>
              <Text style={styles.pieceTitle}>{p.producto?.descripcionCompleta ?? 'Pieza adquirida'}</Text>
              {p.subastaTitulo ? <Text style={styles.muted}>Subasta: {p.subastaTitulo}</Text> : null}
            </View>
          </View>
        </Section>

        {/* Detalle de importe */}
        <Section title="Detalle de importe">
          <View style={styles.line}><Text style={styles.lbl}>Oferta ganadora</Text><Text style={styles.val}>{formatMoney(importe, cur)}</Text></View>
          <View style={styles.line}><Text style={styles.lbl}>Comisiones</Text><Text style={styles.val}>{formatMoney(comision, cur)}</Text></View>
          <View style={styles.line}><Text style={styles.lbl}>Envío</Text><Text style={styles.val}>{p.retiraPersonalmente ? 'Retiro personal' : formatMoney(envio, cur)}</Text></View>
          {multa > 0 ? <View style={styles.line}><Text style={[styles.lbl, { color: Brand.danger }]}>Multa</Text><Text style={[styles.val, { color: Brand.danger }]}>{formatMoney(multa, cur)}</Text></View> : null}
          <View style={[styles.line, styles.totalLine]}><Text style={styles.totalLbl}>Total</Text><Text style={styles.totalVal}>{formatMoney(total, cur)}</Text></View>
        </Section>

        {/* Medio de pago */}
        <Section title="Medio de pago">
          {medio ? (
            <View style={styles.iconRow}><Ionicons name="card-outline" size={16} color={Brand.text} /><Text style={styles.val}>{medio}</Text></View>
          ) : (
            <Text style={styles.muted}>A confirmar con la administración.</Text>
          )}
        </Section>

        {/* Envío / retiro */}
        <Section title="Envío / retiro">
          {p.retiraPersonalmente ? (
            <>
              <View style={styles.iconRow}><Ionicons name="walk-outline" size={16} color={Brand.text} /><Text style={styles.val}>Retiro personal</Text></View>
              <Text style={styles.muted}>En {p.producto?.deposito ?? 'depósito a confirmar'}{p.producto?.ubicacion ? ` · ${p.producto.ubicacion}` : ''}</Text>
              <Text style={[styles.muted, { fontStyle: 'italic' }]}>Sin cobertura de seguro al retirar personalmente.</Text>
            </>
          ) : (
            <>
              <View style={styles.iconRow}><Ionicons name="cube-outline" size={16} color={Brand.text} /><Text style={styles.val}>Envío a domicilio</Text></View>
              <View style={styles.iconRow}>
                <Ionicons name={envioStatus === 'recibido' ? 'checkmark-circle' : envioStatus === 'enviado' ? 'navigate' : 'time-outline'} size={14} color={envioStatus === 'recibido' ? Brand.success : envioStatus === 'enviado' ? Brand.primary : Brand.textMuted} />
                <Text style={styles.val}>{ENVIO_LABEL[envioStatus]}</Text>
              </View>
              <Text style={styles.muted}>Seguimiento: {p.trackingCode ?? `ENV-${p.identificador}`}</Text>
              <Text style={styles.muted}>Origen: {p.producto?.deposito ?? 'depósito'}</Text>
              {p.producto?.seguro ? <Text style={styles.muted}>Póliza {p.producto.seguro.nroPoliza} — {p.producto.seguro.compania}</Text> : null}
              <View style={styles.inlineBtns}>
                <Pressable onPress={() => setTracking(true)} style={styles.outlineBtn}><Ionicons name="navigate-outline" size={15} color={Brand.primary} /><Text style={styles.outlineBtnText}>Seguir envío</Text></Pressable>
                {p.status !== 'derivado_justicia' && envioStatus === 'pendiente' ? (
                  <Pressable onPress={onRetire} disabled={busy === 'retire'} style={styles.outlineBtnDanger}><Text style={styles.outlineBtnDangerText}>{busy === 'retire' ? '...' : 'Retirar personalmente'}</Text></Pressable>
                ) : null}
              </View>
            </>
          )}
        </Section>

        {/* Acciones de factura */}
        <View style={styles.docBtns}>
          <Pressable onPress={openInvoice} style={({ pressed }) => [styles.primaryBtn, pressed && styles.dim]}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Ver factura (PDF)</Text>
          </Pressable>
          <Pressable onPress={sendInvoice} disabled={busy === 'mail'} style={({ pressed }) => [styles.secondaryBtn, (pressed || busy === 'mail') && styles.dim]}>
            <Ionicons name="mail-outline" size={18} color={Brand.primary} />
            <Text style={styles.secondaryBtnText}>{busy === 'mail' ? 'Enviando...' : 'Enviar FC por mail'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal seguimiento de envío */}
      <Modal visible={tracking} transparent animationType="fade" onRequestClose={() => setTracking(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTracking(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Seguimiento del envío</Text>
              <Pressable onPress={() => setTracking(false)} hitSlop={10}><Ionicons name="close" size={22} color={Brand.text} /></Pressable>
            </View>
            <Text style={styles.muted}>Código: {p.trackingCode ?? `ENV-${p.identificador}`}</Text>
            <View style={{ marginTop: space.md }}>
              {steps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepCol}>
                    <Ionicons name={s.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={s.done ? Brand.success : Brand.textMuted} />
                    {i < steps.length - 1 ? <View style={[styles.stepLine, s.done && { backgroundColor: Brand.success }]} /> : null}
                  </View>
                  <Text style={[styles.stepLabel, s.done && styles.stepLabelDone]}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.muted, { fontStyle: 'italic', marginTop: space.sm }]}>El estado del envío lo actualiza la empresa.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  body: { padding: space.lg, paddingBottom: space.xl },
  center: { alignItems: 'center', marginTop: space.xl, gap: space.sm },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium },
  section: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md, marginBottom: space.sm + 2, gap: 4 },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Brand.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  facturaNro: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Brand.text },
  muted: { fontSize: FontSize.xs, color: Brand.textMuted },
  pieceRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  pieceImg: { width: 64, height: 64, borderRadius: Radius.sm, backgroundColor: Brand.bg },
  pieceImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  pieceTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 },
  lbl: { fontSize: FontSize.sm, color: Brand.textMuted },
  val: { fontSize: FontSize.sm, color: Brand.text },
  totalLine: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: Brand.border },
  totalLbl: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.text },
  totalVal: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.accent },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineBtns: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 9, paddingHorizontal: space.md },
  outlineBtnText: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  outlineBtnDanger: { borderWidth: 1, borderColor: Brand.danger, borderRadius: Radius.sm, paddingVertical: 9, paddingHorizontal: space.md },
  outlineBtnDangerText: { color: Brand.danger, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  docBtns: { gap: space.sm, marginTop: space.xs },
  primaryBtn: { flexDirection: 'row', gap: 8, backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  secondaryBtn: { flexDirection: 'row', gap: 8, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: Brand.primary, fontSize: FontSize.base, fontWeight: FontWeight.medium },
  dim: { opacity: 0.7 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: space.lg },
  modalCard: { backgroundColor: Brand.surface, borderRadius: Radius.md, padding: space.lg },
  modalTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.text },
  stepRow: { flexDirection: 'row', gap: space.sm },
  stepCol: { alignItems: 'center', width: 20 },
  stepLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: Brand.border, marginVertical: 2 },
  stepLabel: { fontSize: FontSize.sm, color: Brand.textMuted, paddingBottom: space.md },
  stepLabelDone: { color: Brand.text, fontWeight: FontWeight.medium },
});
