import { readAsStringAsync } from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { register } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { clearRegisterDraft, getRegisterDraft } from '@/state/register-draft';

const PAYMENT_METHODS = [
  { id: 'cuenta_bancaria', titulo: 'Cuenta bancaria', detalle: 'Nacional o extranjera' },
  { id: 'tarjeta_credito', titulo: 'Tarjeta de crédito', detalle: 'Visa, Mastercard, Amex' },
  { id: 'cheque_certificado', titulo: 'Cheque certificado', detalle: 'Monto determinado' },
] as const;

/* Registro - Paso 2: Crear credenciales + Medio de pago (según wireframe "Register 2"). */
export default function RegisterStep2() {
  const router = useRouter();
  const draft = getRegisterDraft();

  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [metodo, setMetodo] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (clave.length < 8) {
      setError('La clave debe tener al menos 8 caracteres.');
      return;
    }
    if (clave !== confirmar) {
      setError('Las claves no coinciden.');
      return;
    }
    if (!metodo) {
      setError('Elegí un medio de pago.');
      return;
    }
    if (!draft) {
      setError('Faltan los datos del paso 1. Volvé a empezar el registro.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const [docFrenteBase64, docDorsoBase64] = await Promise.all([
        readAsStringAsync(draft.docFrente, { encoding: 'base64' }),
        readAsStringAsync(draft.docDorso, { encoding: 'base64' }),
      ]);
      await register({
        nombre: draft.nombre,
        apellido: draft.apellido,
        domicilioLegal: draft.domicilioLegal,
        paisOrigen: draft.paisOrigen,
        email: draft.email,
        password: clave,
        docFrenteBase64,
        docDorsoBase64,
      });
      clearRegisterDraft();
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScreenHeader title="Registro" />
        <View style={styles.successWrap}>
          <Text style={styles.successCheck}>✅</Text>
          <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
          <Text style={styles.successText}>
            La empresa va a verificar tus datos. Vas a recibir un email para completar el registro.
          </Text>
          <Button title="Volver al login" onPress={() => router.replace('/login')} style={styles.successBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Registro" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Crear credenciales</Text>
          <Text style={styles.step}>Paso 2 de 2</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextField
            label="Clave"
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
          {PAYMENT_METHODS.map((m) => {
            const selected = metodo === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMetodo(m.id)}
                style={[styles.payCard, selected && styles.payCardSelected]}>
                <Text style={styles.payTitle}>{m.titulo}</Text>
                <Text style={styles.payDetail}>{m.detalle}</Text>
              </Pressable>
            );
          })}

          <Button
            title="Agregar método de pago"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
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
    fontWeight: FontWeight.bold,
    color: Brand.text,
    textAlign: 'center',
    marginTop: space.md,
    marginBottom: space.md,
  },
  payCard: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  payCardSelected: {
    borderColor: Brand.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(29, 78, 137, 0.05)',
  },
  payTitle: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text },
  payDetail: { fontSize: FontSize.sm, color: Brand.textMuted, marginTop: 2 },
  submitBtn: { marginTop: space.lg },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm },
  successCheck: { fontSize: 56 },
  successTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Brand.text },
  successText: { fontSize: FontSize.base, color: Brand.textMuted, textAlign: 'center', marginTop: space.xs },
  successBtn: { alignSelf: 'stretch', marginTop: space.lg },
});
