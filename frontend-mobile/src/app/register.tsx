import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { setRegisterDraft } from '@/state/register-draft';

/* Registro - Paso 1: Datos personales + fotos del DNI (según wireframe "Register 1"). */
export default function RegisterStep1() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [domicilioLegal, setDomicilioLegal] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('');
  const [email, setEmail] = useState('');
  const [docFrente, setDocFrente] = useState<string>();
  const [docDorso, setDocDorso] = useState<string>();
  const [error, setError] = useState('');

  const pickImage = async (setUri: (uri: string) => void) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para acceder a tus fotos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) setUri(res.assets[0].uri);
  };

  const handleContinue = () => {
    if (!nombre || !apellido || !domicilioLegal || !paisOrigen || !email) {
      setError('Completá todos los datos.');
      return;
    }
    if (!docFrente || !docDorso) {
      setError('Subí ambas fotos del documento (frente y dorso).');
      return;
    }
    setError('');
    setRegisterDraft({ nombre, apellido, domicilioLegal, paisOrigen, email, docFrente, docDorso });
    router.push('/register-credentials');
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
          <Text style={styles.title}>Datos personales</Text>
          <Text style={styles.step}>Paso 1 de 2</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextField label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
          <TextField label="Apellido" value={apellido} onChangeText={setApellido} placeholder="Tu apellido" />
          <TextField
            label="Domicilio Legal"
            value={domicilioLegal}
            onChangeText={setDomicilioLegal}
            placeholder="Calle, número, ciudad"
          />
          <TextField
            label="País de Origen"
            value={paisOrigen}
            onChangeText={setPaisOrigen}
            placeholder="Argentina"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          {/* Subida de documento */}
          <View style={styles.docRow}>
            <DocUpload label="DNI frente" uri={docFrente} onPress={() => pickImage(setDocFrente)} />
            <DocUpload label="DNI dorso" uri={docDorso} onPress={() => pickImage(setDocDorso)} />
          </View>

          <Button title="Continuar" onPress={handleContinue} style={styles.continueBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Caja de carga de imagen con borde punteado (vacía) o miniatura (cargada). */
function DocUpload({ label, uri, onPress }: { label: string; uri?: string; onPress: () => void }) {
  return (
    <View style={styles.docItem}>
      <Text style={styles.docLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.docBox}>
        {uri ? (
          <Image source={{ uri }} style={styles.docImage} resizeMode="cover" />
        ) : (
          <Text style={styles.docPlus}>＋</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  flex: { flex: 1 },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Brand.text,
    textAlign: 'center',
  },
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
  docRow: { flexDirection: 'row', gap: space.md, marginTop: space.xs },
  docItem: { flex: 1 },
  docLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Brand.text,
    marginBottom: space.xs + 2,
  },
  docBox: {
    height: 110,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Brand.textMuted,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  docImage: { width: '100%', height: '100%' },
  docPlus: { fontSize: 32, color: Brand.textMuted },
  continueBtn: { marginTop: space.xl },
});
