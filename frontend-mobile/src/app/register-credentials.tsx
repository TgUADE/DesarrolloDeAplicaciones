import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { completeRegistration } from '@/api/auth';
import type { PaymentMethodType } from '@/api/payment-methods';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';

const PAYMENT_METHODS: Array<{ id: PaymentMethodType; titulo: string; detalle: string }> = [
  { id: 'cuenta_bancaria_nacional', titulo: 'Cuenta bancaria', detalle: 'Nacional o extranjera' },
  { id: 'tarjeta_credito_nacional', titulo: 'Tarjeta de crédito', detalle: 'Visa, Mastercard, Amex' },
  { id: 'cheque_certificado', titulo: 'Cheque certificado', detalle: 'Monto determinado' },
];

/* Segunda etapa: llega por email cuando la empresa aprueba al usuario. */
export default function CompleteRegistration() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';

  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [tipoPago, setTipoPago] = useState<PaymentMethodType>('cuenta_bancaria_nacional');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      setError('Abrí esta pantalla desde el enlace recibido por email.');
      return;
    }
    if (clave.length < 8) {
      setError('La clave debe tener al menos 8 caracteres.');
      return;
    }
    if (clave !== confirmar) {
      setError('Las claves no coinciden.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await completeRegistration({ token, password: clave });
      router.replace({ pathname: '/add-payment-method', params: { userId: user.id, tipo: tipoPago } });
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'No se pudo completar el registro.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Registro" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Completá tu registro</Text>
          <Text style={styles.step}>Cuenta aprobada por la empresa</Text>

          {!token ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>Abrí esta pantalla desde el enlace recibido por email.</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextField
            label="Clave personal"
            value={clave}
            onChangeText={setClave}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
          />
          <TextField
            label="Confirmar clave"
            value={confirmar}
            onChangeText={setConfirmar}
            placeholder="Repetí la clave"
            secureTextEntry
          />

          <Text style={styles.sectionTitle}>Medio de pago</Text>
          <View style={styles.methodList}>
            {PAYMENT_METHODS.map((method) => {
              const selected = tipoPago === method.id;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setTipoPago(method.id)}
                  style={[styles.methodCard, selected && styles.methodCardSelected]}>
                  <Text style={styles.methodTitle}>{method.titulo}</Text>
                  <Text style={styles.methodDetail}>{method.detalle}</Text>
                </Pressable>
              );
            })}
          </View>

          <Button title="Agregar método de pago" onPress={handleSubmit} loading={loading} style={styles.submitBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  flex: { flex: 1 },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Brand.text, textAlign: 'center' },
  step: {
    fontSize: FontSize.sm,
    color: Brand.textMuted,
    textAlign: 'center',
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  warningBox: {
    backgroundColor: 'rgba(239, 159, 39, 0.1)',
    borderWidth: 1,
    borderColor: Brand.warning,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: space.md,
  },
  warningText: { color: Brand.warning, fontSize: FontSize.sm },
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
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Brand.textMuted,
    textAlign: 'center',
    marginTop: space.lg,
    marginBottom: space.md,
  },
  methodList: { gap: space.sm },
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
  submitBtn: { marginTop: space.xl },
});
