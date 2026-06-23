import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStoredUser, isGuestSession } from '@/api/auth';
import { getProfileChangeRequests, getUserProfile, type ProfileChangeRequest, type UserProfile } from '@/api/users';
import { categoryMeta } from '@/constants/categories';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';

function Row({ label, value, locked }: { label: string; value?: string | null; locked?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.label}>{label}</Text>
        {locked ? (
          <View style={styles.lockTag}>
            <Ionicons name="lock-closed" size={11} color={Brand.textMuted} />
            <Text style={styles.lockText}>No editable</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, !value && styles.valueEmpty]}>{value || '—'}</Text>
    </View>
  );
}

export default function PerfilDatos() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latest, setLatest] = useState<ProfileChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
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
      const [p, reqs] = await Promise.all([getUserProfile(me.id), getProfileChangeRequests(me.id).catch(() => [])]);
      setProfile(p);
      setLatest(reqs[0] ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar tus datos.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenHeader title="Datos de perfil" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
        ) : error || !profile ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error || 'No se encontraron datos.'}</Text>
            <Pressable onPress={load}><Text style={styles.retry}>Reintentar</Text></Pressable>
          </View>
        ) : (
          <>
            {latest?.estado === 'pendiente' ? (
              <View style={[styles.banner, styles.bannerPending]}>
                <Ionicons name="time-outline" size={16} color={Brand.warning} />
                <Text style={styles.bannerText}>Tenés una solicitud de cambio de datos pendiente de aprobación.</Text>
              </View>
            ) : latest?.estado === 'rechazada' ? (
              <View style={[styles.banner, styles.bannerRejected]}>
                <Ionicons name="close-circle-outline" size={16} color={Brand.danger} />
                <Text style={styles.bannerText}>Tu última solicitud fue rechazada{latest.motivoRechazo ? `: ${latest.motivoRechazo}` : '.'}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Row label="Nombre" value={profile.nombre} />
              <Row label="Apellido" value={profile.apellido} />
              <Row label="Email" value={profile.email} locked />
              <Row label="Domicilio legal" value={profile.domicilioLegal} />
              <Row label="País de nacimiento" value={profile.paisNacimiento} locked />
              <Row label="Categoría" value={categoryMeta(profile.categoria).label} locked />
              <Row label="Cuenta destino para cobro" value={profile.cuentaCobro} />
            </View>

            {latest?.estado === 'pendiente' ? (
              <View style={[styles.btn, styles.btnDisabled]}>
                <Ionicons name="time-outline" size={18} color={Brand.textMuted} />
                <Text style={styles.btnDisabledText}>Solicitud pendiente</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push('/editar-perfil')}
                style={({ pressed }) => [styles.btn, pressed && styles.dim]}>
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Solicitar actualizar datos</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
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
  card: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md },
  row: { paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: FontSize.xs, color: Brand.textMuted, fontWeight: FontWeight.medium },
  lockTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockText: { fontSize: 10, color: Brand.textMuted },
  value: { fontSize: FontSize.base, color: Brand.text, marginTop: 3 },
  valueEmpty: { color: Brand.placeholder },
  btn: { flexDirection: 'row', gap: 8, backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: space.lg },
  btnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  btnDisabled: { backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border },
  btnDisabledText: { color: Brand.textMuted, fontSize: FontSize.base, fontWeight: FontWeight.medium },
  dim: { opacity: 0.8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.sm, padding: space.md, marginBottom: space.md },
  bannerPending: { backgroundColor: `${Brand.warning}18` },
  bannerRejected: { backgroundColor: `${Brand.danger}14` },
  bannerText: { flex: 1, fontSize: FontSize.xs, color: Brand.text, lineHeight: 17 },
});
