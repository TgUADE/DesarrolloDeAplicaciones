import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredUser, isGuestSession } from '@/api/auth';
import { listMyProducts, type MyProduct } from '@/api/users';
import {
  acceptSubmissionPrice,
  createSubmission,
  listMySubmissions,
  rejectSubmissionPrice,
  type MySubmission,
} from '@/api/submissions';
import { Badge } from '@/components/ui/badge';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente_empresa: { label: 'En revisión', color: Brand.warning },
  interesada: { label: 'Empresa interesada', color: Brand.primary },
  precio_propuesto: { label: 'Precio propuesto', color: Brand.accent },
  aceptada_usuario: { label: 'Aceptada · en subasta', color: Brand.success },
  rechazada_empresa: { label: 'Rechazada por la empresa', color: Brand.danger },
  rechazada_usuario: { label: 'Rechazaste el precio', color: Brand.textMuted },
};

const MIN_FOTOS = 6;

export default function Vender() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isGuest, setIsGuest] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [descripcion, setDescripcion] = useState('');
  const [datosHistoricos, setDatosHistoricos] = useState('');
  const [precio, setPrecio] = useState('');
  const [declaracion, setDeclaracion] = useState(false);
  const [origen, setOrigen] = useState(false);
  const [images, setImages] = useState<string[]>([]); // base64
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [subs, setSubs] = useState<MySubmission[]>([]);
  const [products, setProducts] = useState<MyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([listMySubmissions(uid), listMyProducts(uid).catch(() => [])]);
      setSubs(s);
      setProducts(p);
    } catch {
      // mantener
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const guest = await isGuestSession();
      setIsGuest(guest);
      const me = await getStoredUser();
      if (me) {
        setUserId(me.id);
        load(me.id);
      } else {
        setLoading(false);
      }
    })();
  }, [load]);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para adjuntar imágenes.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.4,
      base64: true,
    });
    if (!res.canceled) {
      const b64 = res.assets.map((a) => a.base64).filter((x): x is string => !!x);
      setImages((prev) => [...prev, ...b64]);
    }
  };

  const submit = async () => {
    setError('');
    if (descripcion.trim().length < 5) return setError('Describí la pieza (mínimo 5 caracteres).');
    if (!precio || Number(precio) <= 0) return setError('Indicá el precio que pedís por la pieza.');
    if (!declaracion) return setError('Debés declarar que el bien te pertenece.');
    if (!origen) return setError('Debés declarar el origen lícito del bien.');
    if (images.length < MIN_FOTOS) return setError(`Subí al menos ${MIN_FOTOS} fotos (tenés ${images.length}).`);

    setSending(true);
    try {
      await createSubmission({ descripcion: descripcion.trim(), datosHistoricos: datosHistoricos.trim() || undefined, precioSugerido: Number(precio), declaracionPropiedad: declaracion, origenLicito: origen, images });
      setDescripcion('');
      setDatosHistoricos('');
      setPrecio('');
      setDeclaracion(false);
      setOrigen(false);
      setImages([]);
      Alert.alert('¡Listo!', 'Tu solicitud fue enviada. La empresa la revisará.');
      if (userId) load(userId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo enviar la solicitud.'));
    } finally {
      setSending(false);
    }
  };

  const onAccept = async (s: MySubmission) => {
    try {
      await acceptSubmissionPrice(s.id);
      if (userId) load(userId);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo aceptar.'));
    }
  };
  const onReject = async (s: MySubmission) => {
    try {
      await rejectSubmissionPrice(s.id);
      if (userId) load(userId);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo rechazar.'));
    }
  };

  if (isGuest || !userId) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.guestTitle}>Vender una pieza</Text>
        <Text style={styles.guestText}>Iniciá sesión para solicitar incluir un artículo tuyo en una subasta.</Text>
        <Pressable onPress={() => router.replace('/login')} style={styles.guestBtn}>
          <Text style={styles.guestBtnText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Text style={styles.headerTitle}>Vender</Text>
        <Text style={styles.headerSub}>Ofrecé una pieza para una futura subasta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Formulario */}
        <View style={styles.card}>
          <Text style={styles.label}>Descripción de la pieza</Text>
          <TextInput style={styles.input} value={descripcion} onChangeText={setDescripcion} placeholder="Ej: Óleo sobre tela, 80x60cm…" placeholderTextColor={Brand.placeholder} multiline />

          <Text style={styles.label}>Datos históricos (opcional)</Text>
          <TextInput style={styles.input} value={datosHistoricos} onChangeText={setDatosHistoricos} placeholder="Artista, año, procedencia, curiosidades…" placeholderTextColor={Brand.placeholder} multiline />

          <Text style={styles.label}>Precio que pedís (ARS)</Text>
          <TextInput style={styles.input} value={precio} onChangeText={(t) => setPrecio(t.replace(/[^0-9]/g, ''))} placeholder="Ej: 50000" placeholderTextColor={Brand.placeholder} keyboardType="number-pad" />

          <Pressable style={styles.check} onPress={() => setDeclaracion((v) => !v)}>
            <View style={[styles.box, declaracion && styles.boxOn]}>{declaracion ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
            <Text style={styles.checkText}>Declaro que el bien me pertenece y no tiene impedimentos para subastarse.</Text>
          </Pressable>
          <Pressable style={styles.check} onPress={() => setOrigen((v) => !v)}>
            <View style={[styles.box, origen && styles.boxOn]}>{origen ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
            <Text style={styles.checkText}>Declaro el origen lícito del bien y puedo acreditarlo si me lo requieren.</Text>
          </Pressable>

          <Pressable style={styles.fotoBtn} onPress={pickImages}>
            <Ionicons name="camera-outline" size={18} color={Brand.primary} />
            <Text style={styles.fotoBtnText}>Agregar fotos ({images.length}/{MIN_FOTOS}+)</Text>
          </Pressable>
          {images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.sm }}>
              {images.map((b64, i) => (
                <View key={i} style={styles.thumbWrap}>
                  <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} style={styles.thumb} contentFit="cover" />
                  <Pressable style={styles.thumbX} onPress={() => setImages((prev) => prev.filter((_, k) => k !== i))} hitSlop={8}>
                    <Ionicons name="close" size={13} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable onPress={submit} disabled={sending} style={({ pressed }) => [styles.submit, (sending || pressed) && styles.dim]}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Enviar solicitud</Text>}
          </Pressable>
        </View>

        {/* Mis solicitudes */}
        <Text style={styles.section}>Mis solicitudes</Text>
        {loading ? (
          <ActivityIndicator color={Brand.primary} style={{ marginTop: space.md }} />
        ) : subs.length === 0 ? (
          <Text style={styles.empty}>Todavía no enviaste solicitudes.</Text>
        ) : (
          subs.map((s) => {
            const meta = STATUS_META[s.status] ?? { label: s.status, color: Brand.textMuted };
            return (
              <View key={s.id} style={styles.subCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.subDesc} numberOfLines={1}>{s.descripcion}</Text>
                  <Badge label={meta.label} color={meta.color} />
                </View>
                <Text style={styles.subMeta}>
                  Pedías: {formatMoney(s.precioSugerido ?? 0, 'ARS')}
                  {s.precioBaseOfrecido != null ? ` · Aceptada en ${formatMoney(s.precioBaseOfrecido, 'ARS')}` : ''}
                </Text>
                {s.status === 'precio_propuesto' ? (
                  <>
                    <Text style={styles.subMeta}>Precio base ofrecido: {formatMoney(s.precioBaseOfrecido ?? 0, 'ARS')}</Text>
                    {s.comisionesInfo ? <Text style={styles.subMeta}>{s.comisionesInfo}</Text> : null}
                    <View style={styles.actionRow}>
                      <Pressable style={[styles.actionBtn, { backgroundColor: Brand.success }]} onPress={() => onAccept(s)}>
                        <Text style={styles.actionText}>Aceptar</Text>
                      </Pressable>
                      <Pressable style={[styles.actionBtn, { backgroundColor: Brand.danger }]} onPress={() => onReject(s)}>
                        <Text style={styles.actionText}>Rechazar</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}
                {s.status === 'rechazada_empresa' && s.motivoRechazo ? (
                  <Text style={styles.subMeta}>Motivo: {s.motivoRechazo}</Text>
                ) : null}
              </View>
            );
          })
        )}

        {/* Mis piezas (dueño): depósito + póliza */}
        {products.length > 0 ? (
          <>
            <Text style={[styles.section, { marginTop: space.lg }]}>Mis piezas entregadas</Text>
            {products.map((p) => (
              <View key={p.identificador} style={styles.subCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.subDesc} numberOfLines={1}>{p.descripcionCompleta}</Text>
                  <Badge label={p.disponible === false ? 'Vendida' : (p.status ?? 'en depósito')} color={p.disponible === false ? Brand.textMuted : Brand.primary} />
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="cube-outline" size={13} color={Brand.textMuted} />
                  <Text style={styles.subMeta}>Depósito: {p.deposito ?? '—'}{p.ubicacion ? ` · ${p.ubicacion}` : ''}</Text>
                </View>
                {p.seguro ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={Brand.textMuted} />
                    <Text style={styles.subMeta}>Póliza {p.seguro.nroPoliza} — {p.seguro.compania}</Text>
                  </View>
                ) : (
                  <View style={styles.metaRow}>
                    <Ionicons name="shield-outline" size={13} color={Brand.textMuted} />
                    <Text style={styles.subMeta}>Sin póliza asignada</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  guestTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Brand.text },
  guestText: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center' },
  guestBtn: { marginTop: space.md, backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 12, paddingHorizontal: space.xl },
  guestBtnText: { color: '#fff', fontWeight: FontWeight.bold },
  header: { backgroundColor: Brand.primary, paddingHorizontal: space.lg, paddingBottom: space.lg, borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#fff' },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { padding: space.lg, paddingBottom: space.xl },
  card: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md, gap: space.sm },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  input: { backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, padding: space.md, color: Brand.text, fontSize: FontSize.sm, minHeight: 44 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xs },
  box: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: Brand.primary, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Brand.primary },
  tick: { color: '#fff', fontSize: 13, fontWeight: FontWeight.bold },
  checkText: { flex: 1, fontSize: FontSize.xs, color: Brand.textMuted, lineHeight: 18 },
  fotoBtn: { flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  fotoBtnText: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  thumbWrap: { marginRight: space.sm },
  thumb: { width: 64, height: 64, borderRadius: Radius.sm, backgroundColor: Brand.bg },
  thumbX: { position: 'absolute', top: -6, right: -6, backgroundColor: Brand.danger, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbXText: { color: '#fff', fontSize: 11, fontWeight: FontWeight.bold },
  error: { color: Brand.danger, fontSize: FontSize.sm },
  submit: { backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: space.sm },
  submitText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  dim: { opacity: 0.6 },
  section: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text, marginTop: space.lg, marginBottom: space.sm },
  empty: { fontSize: FontSize.sm, color: Brand.textMuted },
  subCard: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md, marginBottom: space.sm, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  subDesc: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  subMeta: { fontSize: FontSize.xs, color: Brand.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  actionBtn: { flex: 1, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});
