import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStoredUser } from '@/api/auth';
import { addPaymentMethod, type PaymentMethodType } from '@/api/payment-methods';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { cleanText, hasText } from '@/utils/validation';

const PAYMENT_METHODS: Array<{ id: PaymentMethodType; titulo: string; detalle: string }> = [
  { id: 'cuenta_bancaria_nacional', titulo: 'Cuenta bancaria', detalle: 'Nacional o extranjera' },
  { id: 'tarjeta_credito_nacional', titulo: 'Tarjeta de crédito', detalle: 'Visa, Mastercard, Amex' },
  { id: 'cheque_certificado', titulo: 'Cheque certificado', detalle: 'Monto determinado' },
];

export default function AddPaymentMethod() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; tipo?: PaymentMethodType }>();

  const [userId, setUserId] = useState(params.userId ?? '');
  const [tipoBase, setTipoBase] = useState<PaymentMethodType>(params.tipo ?? 'cuenta_bancaria_nacional');
  const [banco, setBanco] = useState('');
  const [paisBanco, setPaisBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [titularTarjeta, setTitularTarjeta] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [montoGarantia, setMontoGarantia] = useState('');
  const [comprobanteUri, setComprobanteUri] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) return;
    getStoredUser().then((user) => {
      if (user) setUserId(user.id);
    });
  }, [userId]);

  const tipo = useMemo<PaymentMethodType>(() => {
    if (tipoBase.startsWith('cuenta_bancaria')) {
      return moneda === 'USD' ? 'cuenta_bancaria_extranjera' : 'cuenta_bancaria_nacional';
    }
    if (tipoBase.startsWith('tarjeta_credito')) {
      return moneda === 'USD' ? 'tarjeta_credito_internacional' : 'tarjeta_credito_nacional';
    }
    return 'cheque_certificado';
  }, [moneda, tipoBase]);

  const pickComprobante = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) setComprobanteUri(res.assets[0].uri);
  };

  const handleSubmit = async () => {
    const cleanBanco = cleanText(banco);
    const cleanPaisBanco = cleanText(paisBanco);
    const cleanTipoCuenta = cleanText(tipoCuenta);
    const cleanNumeroCuenta = cleanText(numeroCuenta);
    const cleanNumeroTarjeta = cleanText(numeroTarjeta);
    const cleanTitularTarjeta = cleanText(titularTarjeta);
    const cleanVencimiento = cleanText(vencimiento);
    const cleanMontoGarantia = cleanText(montoGarantia);

    if (!userId) {
      setError('No se encontró el usuario de la sesión.');
      return;
    }
    if (!hasText(cleanBanco)) {
      setError('Ingresá el banco.');
      return;
    }
    if (!hasText(cleanPaisBanco)) {
      setError('Ingresá el país del banco.');
      return;
    }
    if (tipo !== 'cheque_certificado' && !hasText(cleanTipoCuenta)) {
      setError('Ingresá el tipo de cuenta.');
      return;
    }
    if (tipo !== 'cheque_certificado' && !hasText(cleanNumeroCuenta)) {
      setError('Ingresá CBU/IBAN o número de cuenta.');
      return;
    }
    if (tipo.startsWith('tarjeta_credito') && (!hasText(cleanNumeroTarjeta) || !hasText(cleanTitularTarjeta) || !hasText(cleanVencimiento))) {
      setError('Completá los datos de la tarjeta.');
      return;
    }
    if (tipo.startsWith('tarjeta_credito') && cleanNumeroTarjeta.length !== 4) {
      setError('Ingresá los últimos 4 dígitos de la tarjeta.');
      return;
    }
    if (tipo === 'cheque_certificado' && !hasText(cleanMontoGarantia)) {
      setError('Ingresá el monto determinado del cheque.');
      return;
    }
    if (tipo === 'cheque_certificado' && (!Number.isFinite(Number(cleanMontoGarantia)) || Number(cleanMontoGarantia) <= 0)) {
      setError('El monto determinado debe ser mayor a cero.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await addPaymentMethod(userId, {
        tipo,
        moneda,
        banco: cleanBanco,
        numeroCuenta: cleanNumeroCuenta || undefined,
        swift: cleanPaisBanco || undefined,
        numeroTarjeta: cleanNumeroTarjeta || undefined,
        titularTarjeta: cleanTitularTarjeta || undefined,
        vencimiento: cleanVencimiento || undefined,
        montoGarantia: cleanMontoGarantia ? Number(cleanMontoGarantia) : undefined,
      });
      router.replace('/home');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'No se pudo agregar el medio de pago.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Agregar medio de pago" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.methodList}>
            {PAYMENT_METHODS.map((method) => {
              const selected =
                method.id === 'cheque_certificado'
                  ? tipoBase === method.id
                  : tipoBase.startsWith(method.id.split('_nacional')[0]);
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setTipoBase(method.id)}
                  style={[styles.methodCard, selected && styles.methodCardSelected]}>
                  <Text style={styles.methodTitle}>{method.titulo}</Text>
                  <Text style={styles.methodDetail}>{method.detalle}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField label="Banco *" value={banco} onChangeText={setBanco} />
          <TextField label="País del banco *" value={paisBanco} onChangeText={setPaisBanco} />
          {tipo !== 'cheque_certificado' ? (
            <>
              <TextField label="Tipo de cuenta *" value={tipoCuenta} onChangeText={setTipoCuenta} />
              <TextField label="CBU/IBAN *" value={numeroCuenta} onChangeText={setNumeroCuenta} autoCapitalize="none" />
            </>
          ) : null}

          <Text style={styles.label}>Moneda de cuenta *</Text>
          <View style={styles.segment}>
            {(['ARS', 'USD'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setMoneda(value)}
                style={[styles.segmentOption, moneda === value && styles.segmentOptionSelected]}>
                <Text style={[styles.segmentText, moneda === value && styles.segmentTextSelected]}>{value}</Text>
              </Pressable>
            ))}
          </View>

          {tipo.startsWith('tarjeta_credito') ? (
            <>
              <TextField
                label="Últimos 4 dígitos *"
                value={numeroTarjeta}
                onChangeText={setNumeroTarjeta}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TextField label="Titular *" value={titularTarjeta} onChangeText={setTitularTarjeta} />
              <TextField label="Vencimiento *" value={vencimiento} onChangeText={setVencimiento} placeholder="MM/AA" />
            </>
          ) : null}

          {tipo === 'cheque_certificado' ? (
            <TextField
              label="Monto determinado *"
              value={montoGarantia}
              onChangeText={setMontoGarantia}
              keyboardType="numeric"
            />
          ) : null}

          <Text style={styles.proofLabel}>Adjuntar foto de comprobación (opcional)</Text>
          <Pressable onPress={pickComprobante} style={styles.proofBox}>
            {comprobanteUri ? (
              <Image source={{ uri: comprobanteUri }} style={styles.proofImage} resizeMode="cover" />
            ) : (
              <Text style={styles.proofPlus}>＋</Text>
            )}
          </Pressable>

          <Button title="Agregar" onPress={handleSubmit} loading={loading} style={styles.submitBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  flex: { flex: 1 },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  errorBox: {
    backgroundColor: 'rgba(226, 75, 74, 0.1)',
    borderWidth: 1,
    borderColor: Brand.danger,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: space.md,
  },
  errorText: { color: Brand.danger, fontSize: FontSize.sm },
  methodList: { gap: space.sm, marginBottom: space.md },
  methodCard: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    paddingHorizontal: space.md,
  },
  methodCardSelected: {
    borderColor: Brand.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(29, 78, 137, 0.06)',
  },
  methodTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  methodDetail: { fontSize: FontSize.xs, color: Brand.textMuted, marginTop: 2 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Brand.text,
    marginBottom: space.xs + 2,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    padding: 4,
    marginBottom: space.md,
  },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm },
  segmentOptionSelected: { backgroundColor: Brand.primary },
  segmentText: { color: Brand.textMuted, fontWeight: FontWeight.medium },
  segmentTextSelected: { color: Brand.textOnPrimary },
  proofLabel: { fontSize: FontSize.sm, color: Brand.textMuted, marginBottom: space.sm },
  proofBox: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Brand.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  proofImage: { width: '100%', height: '100%' },
  proofPlus: { fontSize: 26, color: Brand.textMuted },
  submitBtn: { marginTop: space.xl },
});
