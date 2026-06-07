import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { login } from '@/api/auth';
import { BrandLogo } from '@/components/brand-logo';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Completá email y contraseña');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/home');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se pudo iniciar sesión. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const soon = () => Alert.alert('Próximamente', 'Esta función todavía no está disponible.');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Cabecera de marca (azul sólido, estilo Home - Subastas) */}
          <View style={[styles.header, { paddingTop: insets.top + space.xl }]}>
            <BrandLogo size={88} />
            <Text style={styles.headerTitle}>Bienvenido</Text>
            <Text style={styles.headerSubtitle}>Iniciá sesión para participar</Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor={Brand.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Brand.placeholder}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <Pressable onPress={soon} style={styles.forgotWrap} hitSlop={8}>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [styles.primaryBtn, (pressed || loading) && styles.primaryBtnPressed]}>
              {loading ? (
                <ActivityIndicator color={Brand.textOnPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/register')}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
              <Text style={styles.secondaryBtnText}>Registrate</Text>
            </Pressable>

            <Pressable onPress={soon} style={styles.guestWrap} hitSlop={8}>
              <Text style={styles.guest}>Ingresar como invitado</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: Brand.primary,
    alignItems: 'center',
    gap: space.sm,
    paddingBottom: space.xl + space.md,
    paddingHorizontal: space.lg,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#ffffff',
    marginTop: space.xs,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  form: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
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
  field: { marginBottom: space.md },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Brand.text,
    marginBottom: space.xs + 2,
  },
  input: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: FontSize.base,
    color: Brand.text,
  },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: space.lg },
  forgot: { fontSize: FontSize.sm, color: Brand.textMuted },
  primaryBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnText: {
    color: Brand.textOnPrimary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  secondaryBtn: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: space.xl,
    marginTop: space.xl,
  },
  secondaryBtnPressed: { opacity: 0.7 },
  secondaryBtnText: {
    color: Brand.text,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
  },
  guestWrap: { alignItems: 'center', marginTop: space.xl },
  guest: { fontSize: FontSize.sm, color: Brand.textMuted },
});
