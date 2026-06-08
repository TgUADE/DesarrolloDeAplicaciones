import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { completeRegistration } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

/* Segunda etapa: llega por email cuando la empresa aprueba al usuario. */
export default function CompleteRegistration() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';

  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      await completeRegistration({ token, password: clave });
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
          <Text style={styles.successCheck}>OK</Text>
          <Text style={styles.successTitle}>Registro completado</Text>
          <Text style={styles.successText}>Ya podés iniciar sesión con tu email y clave personal.</Text>
          <Button title="Ir al login" onPress={() => router.replace('/login')} style={styles.successBtn} />
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

          <Button title="Finalizar registro" onPress={handleSubmit} loading={loading} style={styles.submitBtn} />
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
  submitBtn: { marginTop: space.lg },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm },
  successCheck: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Brand.success },
  successTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Brand.text },
  successText: { fontSize: FontSize.base, color: Brand.textMuted, textAlign: 'center', marginTop: space.xs },
  successBtn: { alignSelf: 'stretch', marginTop: space.lg },
});
