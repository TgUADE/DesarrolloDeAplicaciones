import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStoredUser, isGuestSession } from '@/api/auth';
import { getUserProfile, requestProfileChange } from '@/api/users';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Brand, FontSize, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { cleanText, hasText } from '@/utils/validation';

export default function EditarPerfil() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [domicilioLegal, setDomicilioLegal] = useState('');
  const [cuentaCobro, setCuentaCobro] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const p = await getUserProfile(me.id);
      setNombre(p.nombre ?? '');
      setApellido(p.apellido ?? '');
      setDomicilioLegal(p.domicilioLegal ?? '');
      setCuentaCobro(p.cuentaCobro ?? '');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar tus datos.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (!userId) return;
    const n = cleanText(nombre);
    const a = cleanText(apellido);
    if (!hasText(n)) return setError('El nombre es obligatorio.');
    if (!hasText(a)) return setError('El apellido es obligatorio.');

    setError('');
    setSaving(true);
    try {
      await requestProfileChange(userId, {
        nombre: n,
        apellido: a,
        domicilioLegal: cleanText(domicilioLegal),
        cuentaCobro: cleanText(cuentaCobro),
      });
      Alert.alert(
        'Solicitud enviada',
        'Tu solicitud de cambio de datos quedó pendiente. La empresa la va a revisar y, si la aprueba, se van a aplicar los cambios.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo enviar la solicitud.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Actualizar datos" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
          ) : (
            <>
              <Text style={styles.note}>Podés actualizar estos datos. El email, el país de nacimiento y la categoría no se pueden modificar.</Text>

              <TextField label="Nombre" value={nombre} onChangeText={setNombre} />
              <TextField label="Apellido" value={apellido} onChangeText={setApellido} />
              <TextField label="Domicilio legal" value={domicilioLegal} onChangeText={setDomicilioLegal} />
              <TextField
                label="Cuenta destino para cobro"
                value={cuentaCobro}
                onChangeText={setCuentaCobro}
                autoCapitalize="none"
                placeholder="CBU / IBAN / alias"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button title="Solicitar actualizar datos" onPress={submit} loading={saving} style={styles.submit} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  flex: { flex: 1 },
  body: { padding: space.lg, paddingBottom: space.xl },
  note: { fontSize: FontSize.sm, color: Brand.textMuted, lineHeight: 19, marginBottom: space.lg },
  error: { color: Brand.danger, fontSize: FontSize.sm, marginTop: space.xs },
  submit: { marginTop: space.md },
});
