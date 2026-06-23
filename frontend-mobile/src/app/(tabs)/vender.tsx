import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredUser, isGuestSession } from '@/api/auth';
import { listPaymentMethods, type PaymentMethod } from '@/api/payment-methods';
import {
  acceptSubmissionPrice,
  createSubmission,
  listMySubmissions,
  rejectSubmissionPrice,
  type MySubmission,
} from '@/api/submissions';
import { listMyProducts, type MyProduct } from '@/api/users';
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

const accountLabel = (pm: PaymentMethod) => {
  const last4 = pm.numeroCuenta ? ` ····${pm.numeroCuenta.slice(-4)}` : '';
  return `${pm.banco ?? 'Cuenta'} · ${pm.moneda}${last4}`;
};

export default function Vender() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isGuest, setIsGuest] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [artista, setArtista] = useState('');
  const [fechaEpoca, setFechaEpoca] = useState('');
  const [historia, setHistoria] = useState('');
  const [precio, setPrecio] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [selectedPmId, setSelectedPmId] = useState<string | null>(null);
  const [cuentaManual, setCuentaManual] = useState('');
  const [declaracion, setDeclaracion] = useState(false);
  const [origen, setOrigen] = useState(false);
  const [images, setImages] = useState<string[]>([]); // base64
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Datos del usuario
  const [pms, setPms] = useState<PaymentMethod[]>([]);
  const [subs, setSubs] = useState<MySubmission[]>([]);
  const [products, setProducts] = useState<MyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const bankAccounts = pms.filter((p) => p.tipo.startsWith('cuenta_bancaria'));

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [s, p, m] = await Promise.all([
        listMySubmissions(uid),
        listMyProducts(uid).catch(() => []),
        listPaymentMethods(uid).catch(() => []),
      ]);
      setSubs(s);
      setProducts(p);
      setPms(m);
    } catch {
      // mantener
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
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
    }, [load]),
  );

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

  const selectAccount = (pm: PaymentMethod) => {
    setSelectedPmId(pm.id);
    // Las cuentas bancarias son siempre de una sola moneda (ARS o USD).
    setMoneda(pm.moneda === 'USD' ? 'USD' : 'ARS');
    setCuentaManual('');
  };

  const resolveCuenta = (): string => {
    if (selectedPmId) {
      const pm = bankAccounts.find((p) => p.id === selectedPmId);
      if (pm) return accountLabel(pm);
    }
    return cuentaManual.trim();
  };

  const submit = async () => {
    setError('');
    const cuenta = resolveCuenta();
    if (nombre.trim().length < 3) return setError('Ingresá el nombre del artículo.');
    if (descripcion.trim().length < 5) return setError('Describí la pieza (mínimo 5 caracteres).');
    if (!cuenta) return setError('Indicá la cuenta destino para el cobro.');
    if (!precio || Number(precio) <= 0) return setError(`Indicá el monto que pedís (en ${moneda}).`);
    if (!declaracion) return setError('Debés declarar que el bien te pertenece.');
    if (!origen) return setError('Debés declarar el origen lícito del bien.');
    if (images.length < MIN_FOTOS) return setError(`Subí al menos ${MIN_FOTOS} fotos (tenés ${images.length}).`);

    setSending(true);
    try {
      await createSubmission({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        artista: artista.trim() || undefined,
        fechaEpoca: fechaEpoca.trim() || undefined,
        datosHistoricos: historia.trim() || undefined,
        precioSugerido: Number(precio),
        moneda,
        cuentaCobro: cuenta,
        declaracionPropiedad: declaracion,
        origenLicito: origen,
        images,
      });
      setNombre('');
      setDescripcion('');
      setArtista('');
      setFechaEpoca('');
      setHistoria('');
      setPrecio('');
      setSelectedPmId(null);
      setCuentaManual('');
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
          <Text style={styles.label}>Nombre del artículo</Text>
          <TextInput style={styles.inputLine} value={nombre} onChangeText={setNombre} placeholder="Ej: Reloj de pie inglés" placeholderTextColor={Brand.placeholder} />

          <Text style={styles.label}>Descripción</Text>
          <TextInput style={styles.input} value={descripcion} onChangeText={setDescripcion} placeholder="Materiales, medidas, estado de conservación…" placeholderTextColor={Brand.placeholder} multiline />

          <Text style={styles.label}>Artista / diseñador (opcional)</Text>
          <TextInput style={styles.inputLine} value={artista} onChangeText={setArtista} placeholder="Ej: autor o casa fabricante" placeholderTextColor={Brand.placeholder} />

          <Text style={styles.label}>Fecha / Época (opcional)</Text>
          <TextInput style={styles.inputLine} value={fechaEpoca} onChangeText={setFechaEpoca} placeholder="Ej: Circa 1900 · Siglo XIX" placeholderTextColor={Brand.placeholder} />

          <Text style={styles.label}>Historia del objeto (opcional)</Text>
          <TextInput style={styles.input} value={historia} onChangeText={setHistoria} placeholder="Procedencia, anécdotas, exhibiciones…" placeholderTextColor={Brand.placeholder} multiline />

          {/* Fotos */}
          <Text style={styles.label}>Fotografías (mínimo {MIN_FOTOS})</Text>
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

          {/* Cuenta destino para cobro */}
          <Text style={[styles.label, { marginTop: space.sm }]}>Cuenta destino para cobro</Text>
          {bankAccounts.length > 0 ? (
            <View style={styles.accountList}>
              {bankAccounts.map((pm) => {
                const sel = selectedPmId === pm.id;
                return (
                  <Pressable key={pm.id} onPress={() => selectAccount(pm)} style={[styles.account, sel && styles.accountSel]}>
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={sel ? Brand.primary : Brand.textMuted} />
                    <Text style={[styles.accountText, sel && styles.accountTextSel]} numberOfLines={1}>{accountLabel(pm)}</Text>
                    <Badge label={pm.moneda} color={pm.moneda === 'USD' ? Brand.accent : Brand.primary} />
                  </Pressable>
                );
              })}
              <Pressable onPress={() => router.push('/add-payment-method?return=list')} style={styles.addAccount}>
                <Ionicons name="add" size={16} color={Brand.primary} />
                <Text style={styles.addAccountText}>Agregar otra cuenta</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noAccount}>
              <Text style={styles.noAccountText}>No tenés cuentas bancarias cargadas. Podés agregar una o ingresarla manualmente.</Text>
              <Pressable onPress={() => router.push('/add-payment-method?return=list')} style={styles.addAccount}>
                <Ionicons name="add" size={16} color={Brand.primary} />
                <Text style={styles.addAccountText}>Agregar medio de pago</Text>
              </Pressable>
              <View style={styles.segment}>
                {(['ARS', 'USD'] as const).map((m) => (
                  <Pressable key={m} onPress={() => setMoneda(m)} style={[styles.segmentOpt, moneda === m && styles.segmentOptSel]}>
                    <Text style={[styles.segmentText, moneda === m && styles.segmentTextSel]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={styles.inputLine} value={cuentaManual} onChangeText={setCuentaManual} placeholder="CBU / IBAN / alias" placeholderTextColor={Brand.placeholder} autoCapitalize="none" />
            </View>
          )}

          {/* Precio en la moneda de la cuenta */}
          <Text style={[styles.label, { marginTop: space.sm }]}>Monto que pedís ({moneda})</Text>
          <View style={styles.precioRow}>
            <Text style={styles.precioCur}>{moneda === 'USD' ? 'US$' : '$'}</Text>
            <TextInput
              style={styles.precioInput}
              value={precio}
              onChangeText={(t) => setPrecio(t.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={Brand.placeholder}
              keyboardType="number-pad"
            />
          </View>
          <Text style={styles.hint}>El monto se cobra en la moneda de la cuenta destino seleccionada.</Text>

          {/* Declaraciones */}
          <Pressable style={styles.check} onPress={() => setDeclaracion((v) => !v)}>
            <View style={[styles.box, declaracion && styles.boxOn]}>{declaracion ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
            <Text style={styles.checkText}>Declaro que el bien me pertenece y no tiene impedimentos para subastarse.</Text>
          </Pressable>
          <Pressable style={styles.check} onPress={() => setOrigen((v) => !v)}>
            <View style={[styles.box, origen && styles.boxOn]}>{origen ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}</View>
            <Text style={styles.checkText}>Declaro el origen lícito del bien y puedo acreditarlo si me lo requieren.</Text>
          </Pressable>

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
            const cur = (s.moneda as 'ARS' | 'USD') ?? 'ARS';
            return (
              <View key={s.id} style={styles.subCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.subDesc} numberOfLines={1}>{s.nombre || s.descripcion}</Text>
                  <Badge label={meta.label} color={meta.color} />
                </View>
                <Text style={styles.subMeta}>
                  Pedías: {formatMoney(Number(s.precioSugerido ?? 0), cur)}
                  {s.precioBaseOfrecido != null ? ` · Aceptada en ${formatMoney(Number(s.precioBaseOfrecido), cur)}` : ''}
                </Text>
                {s.status === 'precio_propuesto' ? (
                  <>
                    <Text style={styles.subMeta}>Precio base ofrecido: {formatMoney(Number(s.precioBaseOfrecido ?? 0), cur)}</Text>
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
            <View style={[styles.rowBetween, { marginTop: space.lg, marginBottom: space.sm }]}>
              <Text style={[styles.section, { marginTop: 0, marginBottom: 0 }]}>Mis piezas entregadas</Text>
              <Pressable onPress={() => router.push('/seguros')} hitSlop={8}>
                <Text style={styles.linkText}>Ver mis seguros ›</Text>
              </Pressable>
            </View>
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
  input: { backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, padding: space.md, color: Brand.text, fontSize: FontSize.sm, minHeight: 64, textAlignVertical: 'top' },
  inputLine: { backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, paddingHorizontal: space.md, paddingVertical: 11, color: Brand.text, fontSize: FontSize.sm },
  // Cuenta destino
  accountList: { gap: space.xs },
  account: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, paddingVertical: 10, paddingHorizontal: space.md, backgroundColor: Brand.bg },
  accountSel: { borderColor: Brand.primary, borderWidth: 2, backgroundColor: 'rgba(29,78,137,0.06)' },
  accountText: { flex: 1, fontSize: FontSize.sm, color: Brand.text },
  accountTextSel: { fontWeight: FontWeight.medium },
  addAccount: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addAccountText: { color: Brand.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  noAccount: { gap: space.xs },
  noAccountText: { fontSize: FontSize.xs, color: Brand.textMuted, lineHeight: 18 },
  segment: { flexDirection: 'row', backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, padding: 4 },
  segmentOpt: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm },
  segmentOptSel: { backgroundColor: Brand.primary },
  segmentText: { color: Brand.textMuted, fontWeight: FontWeight.medium },
  segmentTextSel: { color: '#fff' },
  // Precio
  precioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, paddingHorizontal: space.md },
  precioCur: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.textMuted, marginRight: 6 },
  precioInput: { flex: 1, paddingVertical: 11, color: Brand.text, fontSize: FontSize.base, fontWeight: FontWeight.medium },
  hint: { fontSize: FontSize.xs, color: Brand.textMuted },
  // Checks
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xs },
  box: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: Brand.primary, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Brand.primary },
  checkText: { flex: 1, fontSize: FontSize.xs, color: Brand.textMuted, lineHeight: 18 },
  fotoBtn: { flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  fotoBtnText: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  thumbWrap: { marginRight: space.sm },
  thumb: { width: 64, height: 64, borderRadius: Radius.sm, backgroundColor: Brand.bg },
  thumbX: { position: 'absolute', top: -6, right: -6, backgroundColor: Brand.danger, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  error: { color: Brand.danger, fontSize: FontSize.sm },
  submit: { backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 14, alignItems: 'center', marginTop: space.sm },
  submitText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  dim: { opacity: 0.6 },
  section: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text, marginTop: space.lg, marginBottom: space.sm },
  linkText: { fontSize: FontSize.sm, color: Brand.primary, fontWeight: FontWeight.medium },
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
