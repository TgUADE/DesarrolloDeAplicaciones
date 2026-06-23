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
  acceptAppraisal,
  acceptOffer,
  createSubmission,
  listMySubmissions,
  markShipped,
  rejectAppraisal,
  rejectOffer,
  type MySubmission,
} from '@/api/submissions';
import { listMyProducts, type MyProduct } from '@/api/users';
import { Badge } from '@/components/ui/badge';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente_empresa: { label: 'En revisión', color: Brand.warning },
  oferta_inicial: { label: 'Oferta recibida', color: Brand.accent },
  por_enviar: { label: 'Aceptada · a enviar', color: Brand.primary },
  enviado: { label: 'Enviado', color: Brand.primary },
  recibido: { label: 'Recibido · en tasación', color: Brand.primary },
  tasacion_final: { label: 'Tasación recibida', color: Brand.accent },
  aceptada_usuario: { label: 'Aceptada · en espera', color: Brand.success },
  rechazada_empresa: { label: 'Rechazada por la empresa', color: Brand.danger },
  rechazada_usuario: { label: 'Rechazaste la oferta', color: Brand.textMuted },
  rechazada_final: { label: 'Rechazaste la tasación', color: Brand.textMuted },
};

// Para una solicitud ACEPTADA, el badge depende del estado real de la pieza:
// en espera (todavía no asignada) → en subasta / programada → vendida.
function aceptadaMeta(s: MySubmission): { label: string; color: string } {
  if (s.productoStatus === 'vendido') return { label: 'Vendida', color: Brand.textMuted };
  if (s.productoStatus === 'en_subasta') {
    if (s.subastaEstado === 'abierta') return { label: 'En subasta (en vivo)', color: Brand.danger };
    if (s.subastaEstado === 'programada') return { label: 'En subasta programada', color: Brand.warning };
    if (s.subastaEstado === 'cerrada' || s.subastaEstado === 'finalizada') return { label: 'Subasta finalizada', color: Brand.textMuted };
    return { label: 'En subasta', color: Brand.primary };
  }
  return { label: 'Aceptada · en espera', color: Brand.success };
}

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
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [selectedPmId, setSelectedPmId] = useState<string | null>(null);
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

  const allBankAccounts = pms.filter((p) => p.tipo.startsWith('cuenta_bancaria'));
  // Como cuenta destino de cobro solo se pueden usar cuentas bancarias VALIDADAS (aprobadas).
  const approvedAccounts = allBankAccounts.filter((p) => p.estado === 'aprobada');

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
  };

  const resolveCuenta = (): string => {
    const pm = approvedAccounts.find((p) => p.id === selectedPmId);
    return pm ? accountLabel(pm) : '';
  };

  const submit = async () => {
    setError('');
    const cuenta = resolveCuenta();
    if (nombre.trim().length < 3) return setError('Ingresá el nombre del artículo.');
    if (descripcion.trim().length < 5) return setError('Describí la pieza (mínimo 5 caracteres).');
    if (!cuenta) return setError('Elegí una cuenta bancaria validada como destino del cobro.');
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
      setSelectedPmId(null);
      setDeclaracion(false);
      setOrigen(false);
      setImages([]);
      Alert.alert('¡Listo!', 'Tu solicitud fue enviada. La empresa la va a revisar y te va a ofrecer un valor.');
      if (userId) load(userId);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo enviar la solicitud.'));
    } finally {
      setSending(false);
    }
  };

  // Ejecuta una acción de la solicitud y recarga la lista.
  const act = async (fn: (id: string) => Promise<void>, id: string) => {
    try {
      await fn(id);
      if (userId) load(userId);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo completar la acción.'));
    }
  };

  const onShipped = (s: MySubmission) => {
    Alert.alert('Confirmar envío', '¿Confirmás que ya enviaste el ítem a la dirección indicada? La empresa lo va a inspeccionar al recibirlo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, lo envié', onPress: () => act(markShipped, s.id) },
    ]);
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

          {/* Cuenta destino para cobro: solo cuentas bancarias validadas */}
          <Text style={[styles.label, { marginTop: space.sm }]}>Cuenta destino para cobro</Text>
          <Text style={styles.hint}>Solo se pueden usar cuentas bancarias validadas por la empresa.</Text>
          {approvedAccounts.length > 0 ? (
            <View style={styles.accountList}>
              {approvedAccounts.map((pm) => {
                const sel = selectedPmId === pm.id;
                return (
                  <Pressable key={pm.id} onPress={() => selectAccount(pm)} style={[styles.account, sel && styles.accountSel]}>
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={sel ? Brand.primary : Brand.textMuted} />
                    <Text style={[styles.accountText, sel && styles.accountTextSel]} numberOfLines={1}>{accountLabel(pm)}</Text>
                    <Badge label={pm.moneda} color={pm.moneda === 'USD' ? Brand.accent : Brand.primary} />
                  </Pressable>
                );
              })}
              <Pressable onPress={() => router.push('/payment-methods')} style={styles.addAccount}>
                <Ionicons name="card-outline" size={16} color={Brand.primary} />
                <Text style={styles.addAccountText}>Gestionar cuentas</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noAccount}>
              <Text style={styles.noAccountText}>
                {allBankAccounts.length > 0
                  ? 'Tus cuentas bancarias todavía no fueron validadas por la empresa. Vas a poder elegirlas para el cobro cuando las aprueben.'
                  : 'No tenés cuentas bancarias validadas. Agregá una cuenta bancaria y esperá la aprobación de la empresa para poder cobrar.'}
              </Text>
              <Pressable onPress={() => router.push('/payment-methods')} style={styles.addAccount}>
                <Ionicons name="card-outline" size={16} color={Brand.primary} />
                <Text style={styles.addAccountText}>Gestionar medios de pago</Text>
              </Pressable>
            </View>
          )}

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
            const meta = s.status === 'aceptada_usuario' ? aceptadaMeta(s) : (STATUS_META[s.status] ?? { label: s.status, color: Brand.textMuted });
            const cur = (s.moneda as 'ARS' | 'USD') ?? 'ARS';
            return (
              <View key={s.id} style={styles.subCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.subDesc} numberOfLines={1}>{s.nombre || s.descripcion}</Text>
                  <Badge label={meta.label} color={meta.color} />
                </View>
                {s.status === 'pendiente_empresa' ? (
                  <Text style={styles.subMeta}>La empresa está revisando tu solicitud. Te va a ofrecer un valor.</Text>
                ) : null}

                {s.status === 'oferta_inicial' ? (
                  <>
                    <Text style={styles.subMeta}>La empresa te ofrece <Text style={styles.strong}>{formatMoney(Number(s.valorOfrecido ?? 0), cur)}</Text>. Si aceptás, vas a tener que enviar la pieza para su inspección.</Text>
                    <View style={styles.actionRow}>
                      <Pressable style={[styles.actionBtn, { backgroundColor: Brand.success }]} onPress={() => act(acceptOffer, s.id)}>
                        <Text style={styles.actionText}>Aceptar oferta</Text>
                      </Pressable>
                      <Pressable style={[styles.actionBtn, { backgroundColor: Brand.danger }]} onPress={() => act(rejectOffer, s.id)}>
                        <Text style={styles.actionText}>Rechazar</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}

                {s.status === 'por_enviar' ? (
                  <>
                    <Text style={styles.subMeta}>Aceptaste la oferta de {formatMoney(Number(s.valorOfrecido ?? 0), cur)}. Enviá la pieza a:</Text>
                    <View style={styles.addrBox}>
                      <Ionicons name="location-outline" size={14} color={Brand.text} />
                      <Text style={styles.addrText}>{s.direccionEnvio ?? 'Dirección a confirmar con la empresa'}</Text>
                    </View>
                    <Pressable style={styles.shipBtn} onPress={() => onShipped(s)}>
                      <Ionicons name="cube-outline" size={16} color="#fff" />
                      <Text style={styles.actionText}>Ítem enviado</Text>
                    </Pressable>
                  </>
                ) : null}

                {s.status === 'enviado' ? (
                  <Text style={styles.subMeta}>Marcaste el ítem como enviado. Esperando que la empresa lo reciba e inspeccione.</Text>
                ) : null}

                {s.status === 'recibido' ? (
                  <Text style={styles.subMeta}>La empresa recibió tu ítem y lo está tasando. Te va a llegar la tasación final.</Text>
                ) : null}

                {s.status === 'tasacion_final' ? (
                  <>
                    <Text style={styles.subMeta}>Tasación final — base: <Text style={styles.strong}>{formatMoney(Number(s.precioBaseOfrecido ?? 0), cur)}</Text> · comisión: <Text style={styles.strong}>{Number(s.comisionPorcentaje ?? 0)}%</Text></Text>
                    {s.comisionesInfo ? <Text style={styles.subMeta}>{s.comisionesInfo}</Text> : null}
                    <Text style={styles.subMetaItalic}>Si rechazás, se te devuelve el ítem con el envío a tu cargo.</Text>
                    <View style={styles.actionRow}>
                      <Pressable style={[styles.actionBtn, { backgroundColor: Brand.success }]} onPress={() => act(acceptAppraisal, s.id)}>
                        <Text style={styles.actionText}>Aceptar</Text>
                      </Pressable>
                      <Pressable style={[styles.actionBtn, { backgroundColor: Brand.danger }]} onPress={() => act(rejectAppraisal, s.id)}>
                        <Text style={styles.actionText}>Rechazar</Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}

                {s.status === 'aceptada_usuario' ? (
                  <Text style={styles.subMeta}>
                    {s.productoStatus === 'vendido'
                      ? `Vendida en subasta (base ${formatMoney(Number(s.precioBaseOfrecido ?? 0), cur)}).`
                      : s.productoStatus === 'en_subasta'
                        ? `Tu pieza está ${s.subastaEstado === 'abierta' ? 'siendo subastada en vivo' : s.subastaEstado === 'programada' ? 'en una subasta programada' : 'en una subasta'} (base ${formatMoney(Number(s.precioBaseOfrecido ?? 0), cur)}). Si nadie oferta, la empresa la compra al precio base.`
                        : `Aceptaste la tasación (base ${formatMoney(Number(s.precioBaseOfrecido ?? 0), cur)}). La empresa la va a incluir en una próxima subasta.`}
                  </Text>
                ) : null}

                {(s.status === 'rechazada_empresa' || s.status === 'rechazada_final') && s.motivoRechazo ? (
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
  empty: { fontSize: FontSize.sm, color: Brand.textMuted },
  subCard: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.md, padding: space.md, marginBottom: space.sm, gap: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  subDesc: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  subMeta: { fontSize: FontSize.xs, color: Brand.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  actionBtn: { flex: 1, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  strong: { fontWeight: FontWeight.bold, color: Brand.text },
  subMetaItalic: { fontSize: FontSize.xs, color: Brand.textMuted, fontStyle: 'italic', marginTop: 2 },
  addrBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: Brand.bg, borderRadius: Radius.sm, padding: space.sm, marginTop: 4 },
  addrText: { flex: 1, fontSize: FontSize.xs, color: Brand.text, lineHeight: 17 },
  shipBtn: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 11, marginTop: space.sm },
});
