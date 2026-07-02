import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Socket } from 'socket.io-client';

import {
  getAuction,
  getAuctionBids,
  getCurrentItem,
  joinAuction,
  leaveAuction,
  placeBid,
  type Auction,
  type Bid,
  type Item,
} from '@/api/auctions';
import { getStoredUser } from '@/api/auth';
import { listPaymentMethods, type PaymentMethod } from '@/api/payment-methods';
import { createAuctionSocket } from '@/api/socket';
import { Badge } from '@/components/ui/badge';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { calcMaxBid, calcMinBid } from '@/utils/bid-limits';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCountdown, formatDate, formatMoney } from '@/utils/format';
import { imageUrl } from '@/utils/media';

export default function SubastaEnVivo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { auctionId } = useLocalSearchParams<{ auctionId: string }>();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [mejorOferta, setMejorOferta] = useState<number | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [pmId, setPmId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [canBid, setCanBid] = useState(false);
  const [bidNotice, setBidNotice] = useState('');
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidError, setBidError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [notice, setNotice] = useState('');
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [won, setWon] = useState<{ piece: string; purchaseId: number | null; hasNext: boolean } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const meIdRef = useRef<string | null>(null);
  const itemRef = useRef<Item | null>(null);

  const toMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : null);
  const remainingMs = endsAt != null ? endsAt - now : null;

  // Ticker de 1s para la cuenta regresiva.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Mantener una referencia al ítem actual (para saber qué pieza gané en el evento del socket).
  useEffect(() => {
    itemRef.current = item;
  }, [item]);

  // Mejor oferta vigente (o precio base si no hubo pujas).
  const precioBase = item?.precioBase != null ? Number(item.precioBase) : 0;
  const ultimaOferta = mejorOferta ?? precioBase;
  const categoria = auction?.categoria ?? 'comun';
  const min = item ? calcMinBid(precioBase, ultimaOferta, categoria) : 0;
  const max = item ? calcMaxBid(precioBase, ultimaOferta, categoria) : null;
  const moneda = auction?.moneda ?? '';
  const cover = imageUrl(item?.images?.[0]?.url);
  const isTopBidder = bids.length > 0 && (bids[0].userId ?? bids[0].user?.id) === userId;
  // El dueño no puede pujar por su propio ítem.
  const isOwnItem = !!item?.currentOwner?.id && !!userId && String(item.currentOwner.id) === userId;

  useEffect(() => {
    if (!auctionId) return;
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await getStoredUser();
        if (!me) {
          router.replace('/login');
          return;
        }
        if (!active) return;
        setUserId(me.id);
        meIdRef.current = me.id;

        const [a, current, history, pms] = await Promise.all([
          getAuction(auctionId),
          getCurrentItem(auctionId),
          getAuctionBids(auctionId),
          listPaymentMethods(me.id).catch(() => []),
        ]);
        if (!active) return;

        setAuction(a);
        setItem(current.item);
        setMejorOferta(current.mejorOferta != null ? Number(current.mejorOferta) : null);
        setEndsAt(toMs(current.endsAt));
        setBids(history);

        const verified = pms.filter((p) => p.verificado && p.activo);
        // El medio de pago debe cubrir la moneda de la subasta (o ser una tarjeta "AMBAS").
        const covers = (m: string) => m === a.moneda || m === 'AMBAS';
        const amountOf = (p: PaymentMethod) => Number(p.montoDisponible ?? p.montoGarantia ?? 0);
        const verifiedBeforeStart = (p: PaymentMethod) => {
          if (p.tipo !== 'cheque_certificado') return true;
          const approvedAt = p.verifiedAt ?? p.updatedAt;
          if (!approvedAt) return false;
          return new Date(approvedAt).getTime() < new Date(a.fechaHora).getTime();
        };
        const compatiblesPorMoneda = verified.filter((p) => covers(p.moneda) && amountOf(p) > 0);
        const compatibles = compatiblesPorMoneda.filter(verifiedBeforeStart);
        const usable = compatibles[0];
        setPaymentMethods(compatibles);
        setPmId(usable?.id ?? null);

        // Motivo por el cual (no) puede pujar, para avisarle al usuario.
        if (pms.length === 0) {
          setBidNotice('Agregá un medio de pago verificado para poder pujar.');
        } else if (verified.length === 0) {
          setBidNotice('Tu medio de pago está pendiente de verificación. Vas a poder pujar cuando la empresa lo apruebe.');
        } else if (!usable) {
          const hasLateCheck = compatiblesPorMoneda.some((p) => p.tipo === 'cheque_certificado' && !verifiedBeforeStart(p));
          setBidNotice(
            hasLateCheck
              ? 'El cheque certificado debe estar aprobado antes del inicio de la subasta para poder pujar.'
              : `Esta subasta es en ${a.moneda}: necesitás un medio de pago aprobado, con monto declarado, en ${a.moneda} (o una tarjeta que cubra ambas monedas).`,
          );
        } else {
          setBidNotice('');
        }

        // Unirse (valida categoría/estado/medio de pago). No bloquea la vista.
        try {
          const { canBid: cb } = await joinAuction(auctionId);
          if (active) setCanBid(cb && !!usable);
        } catch (err) {
          if (active) setBidError(getApiErrorMessage(err, 'No podés pujar en esta subasta.'));
        }

        await connectSocket();
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, 'No se pudo cargar la subasta.'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      const s = socketRef.current;
      if (s) {
        s.emit('leave', { auctionId });
        s.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  // Re-lee la pieza en remate y su historial (al cambiar de ítem).
  const refreshCurrent = async () => {
    try {
      const [current, history] = await Promise.all([
        getCurrentItem(auctionId),
        getAuctionBids(auctionId),
      ]);
      setItem(current.item);
      setMejorOferta(current.mejorOferta != null ? Number(current.mejorOferta) : null);
      setEndsAt(toMs(current.endsAt));
      setBids(history);
      setMonto('');
      setBidError('');
    } catch {
      // mantener estado actual si falla
    }
  };

  const connectSocket = async () => {
    try {
      const s = await createAuctionSocket();
      socketRef.current = s;
      s.on('connect', () => {
        setLiveConnected(true);
        s.emit('join', { auctionId });
      });
      s.on('disconnect', () => setLiveConnected(false));
      s.on('bid:new', (payload: { puja: Bid; mejorOferta: number; endsAt?: string }) => {
        setMejorOferta(Number(payload.mejorOferta));
        if (payload.endsAt) setEndsAt(toMs(payload.endsAt));
        setBids((prev) =>
          prev.some((b) => b.id === payload.puja.id) ? prev : [payload.puja, ...prev],
        );
      });
      // Pieza adjudicada (cerrada por el martillero).
      s.on('item:sold', (payload: { closedItemId: string; winnerId?: number | string | null; purchaseId?: number | null; nextItemId?: number | null; purchase?: { clienteId?: number | string | null; identificador?: number | null } | null }) => {
        const winnerId = payload.winnerId ?? payload.purchase?.clienteId ?? null;
        const purchaseId = payload.purchaseId ?? payload.purchase?.identificador ?? null;
        if (winnerId != null && String(winnerId) === meIdRef.current) {
          setWon({ piece: itemRef.current?.descripcion ?? 'la pieza', purchaseId, hasNext: payload.nextItemId != null });
        } else {
          setNotice('Se adjudicó la pieza anterior.');
        }
        refreshCurrent();
      });
      // Avanza a la siguiente pieza del catálogo.
      s.on('auction:item-changed', () => {
        setNotice('');
        refreshCurrent();
      });
      s.connect();
    } catch {
      setLiveConnected(false);
    }
  };

  const setQuick = (delta: number | 'min' | 'max') => {
    setBidError('');
    if (delta === 'min') return setMonto(String(Math.ceil(min)));
    if (delta === 'max') return setMonto(max != null ? String(Math.floor(max)) : String(Math.ceil(min)));
    const base = Number(monto) || Math.ceil(min);
    setMonto(String(base + delta));
  };

  const submitBid = async () => {
    setBidError('');
    const value = Number(monto);
    if (isOwnItem) return setBidError('No podés pujar por tu propio ítem.');
    if (!pmId) return setBidError('Necesitás un medio de pago verificado para pujar.');
    if (!value || Number.isNaN(value)) return setBidError('Ingresá un monto válido.');
    if (value < min) return setBidError(`La puja mínima es ${formatMoney(min, moneda)}.`);
    if (max != null && value > max) return setBidError(`La puja máxima es ${formatMoney(max, moneda)}.`);

    setPlacing(true);
    try {
      const res = await placeBid(auctionId, value, pmId);
      // Actualización optimista (por si el socket no está conectado).
      setMejorOferta(Number(res.mejorOferta));
      setBids((prev) => (prev.some((b) => b.id === res.puja.id) ? prev : [res.puja, ...prev]));
      setMonto('');
    } catch (err) {
      setBidError(getApiErrorMessage(err, 'No se pudo registrar la puja.'));
    } finally {
      setPlacing(false);
    }
  };

  const abandonar = async () => {
    try {
      socketRef.current?.emit('leave', { auctionId });
      await leaveAuction(auctionId);
    } catch {
      // ignorar; igual salimos
    }
    router.back();
  };

  const selectedPaymentMethod = paymentMethods.find((pm) => pm.id === pmId) ?? null;
  const selectedAvailable = Number(selectedPaymentMethod?.montoDisponible ?? selectedPaymentMethod?.montoGarantia ?? 0);
  const bidAmount = Number(monto || 0);
  const estimatedBidTotal = bidAmount ? bidAmount + bidAmount * 0.1 + Math.round(bidAmount * 0.02) : 0; // comisión de compra 10% + envío 2%
  const mayApplyFine = !!selectedPaymentMethod && bidAmount > 0 && selectedAvailable > 0 && estimatedBidTotal > selectedAvailable;
  const methodTitle = (pm: PaymentMethod) => {
    if (pm.tipo.startsWith('tarjeta')) return `${pm.banco ?? 'Tarjeta'} ···· ${pm.numeroTarjeta ?? ''}`.trim();
    if (pm.tipo === 'cheque_certificado') return `${pm.banco ?? 'Cheque certificado'} · cheque`;
    return `${pm.banco ?? 'Cuenta'}${pm.numeroCuenta ? ` · ${pm.numeroCuenta.slice(-4)}` : ''}`;
  };

  if (won) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.back}>←</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Subasta en vivo</Text>
          </View>
        </View>
        <View style={styles.wonWrap}>
          <Text style={styles.wonEmoji}>🎉</Text>
          <Text style={styles.wonTitle}>¡Ganaste la subasta!</Text>
          <Text style={styles.wonPiece}>{won.piece}</Text>
          <Text style={styles.wonMsg}>
            Te adjudicaste la pieza. Podés ver el detalle de la compra o seguir con el próximo ítem de la subasta.
          </Text>
          <Pressable onPress={() => { setWon(null); refreshCurrent(); }} style={({ pressed }) => [styles.wonPrimary, pressed && styles.dim]}>
            <Text style={styles.wonPrimaryText}>{won.hasNext ? 'Seguir con el siguiente ítem' : 'Volver a la subasta'}</Text>
          </Pressable>
          <Pressable onPress={() => { const pid = won.purchaseId; setWon(null); router.push(pid != null ? `/purchase/${pid}` : '/mis-compras'); }} style={({ pressed }) => [styles.wonSecondary, pressed && styles.dim]}>
            <Text style={styles.wonSecondaryText}>Ver detalle de compra</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header oscuro con la pieza actual */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Subasta en vivo</Text>
          <Badge label={liveConnected ? 'EN VIVO' : 'Sin conexión'} color={liveConnected ? Brand.danger : Brand.textMuted} />
        </View>
        {item ? (
          <View style={styles.pieceBox}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.pieceThumb} contentFit="cover" transition={150} />
            ) : null}
            <View style={styles.pieceTextCol}>
              <Text style={styles.pieceLabel}>Pieza actual</Text>
              <Text style={styles.pieceTitle} numberOfLines={1}>
                {item.descripcion}
              </Text>
              <Text style={styles.pieceMeta} numberOfLines={1}>
                {auction?.titulo}
                {item.precioBase != null ? ` · Base: ${formatMoney(item.precioBase, moneda)}` : ''}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : auction && auction.status !== 'abierta' ? (
        <View style={styles.center}>
          <Text style={styles.notOpen}>La subasta todavía no está abierta.</Text>
          <Text style={styles.muted}>Comienza el {formatDate(auction.fechaHora)}.</Text>
        </View>
      ) : !item ? (
        <View style={styles.center}>
          {notice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}
          <Text style={styles.notOpen}>Esperando la próxima pieza…</Text>
          <Text style={styles.muted}>El martillero todavía no inició el siguiente ítem.</Text>
        </View>
      ) : (
        <View style={styles.liveBody}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {notice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {/* Temporizador del ítem */}
          {remainingMs != null ? (
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Cierra en</Text>
              <Text style={[styles.timerValue, remainingMs <= 30000 && { color: Brand.danger }]}>
                {remainingMs > 0 ? formatCountdown(remainingMs) : 'Cerrando…'}
              </Text>
            </View>
          ) : null}

          {/* Mejor oferta */}
          <View style={styles.offerCard}>
            <Text style={styles.muted}>Mejor oferta actual</Text>
            <Text style={styles.offerValue}>{formatMoney(mejorOferta ?? precioBase, moneda)}</Text>
            <View style={styles.minmax}>
              <View style={styles.minmaxItem}>
                <Text style={styles.muted}>Mín.</Text>
                <Text style={[styles.minmaxValue, { color: Brand.success }]}>{formatMoney(min, moneda)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.minmaxItem}>
                <Text style={styles.muted}>Máx.</Text>
                <Text style={[styles.minmaxValue, { color: Brand.danger }]}>
                  {max != null ? formatMoney(max, moneda) : 'Sin tope'}
                </Text>
              </View>
            </View>
          </View>

          {/* Tu oferta */}
          <Text style={styles.section}>Tu oferta</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currency}>{moneda}</Text>
            <TextInput
              style={styles.input}
              value={monto}
              onChangeText={(t) => {
                setBidError('');
                setMonto(t.replace(/[^0-9]/g, ''));
              }}
              placeholder={String(Math.ceil(min))}
              placeholderTextColor={Brand.placeholder}
              keyboardType="number-pad"
              editable={canBid && !placing && !isTopBidder && !isOwnItem}
            />
          </View>
          <View style={styles.quickRow}>
            {([
              { label: 'Mín', v: 'min' as const },
              { label: '+250', v: 250 },
              { label: '+500', v: 500 },
              { label: 'Máx', v: 'max' as const },
            ]).map((q) => (
              <Pressable
                key={q.label}
                onPress={() => setQuick(q.v)}
                disabled={!canBid || isTopBidder || isOwnItem}
                style={[styles.quick, (!canBid || isTopBidder || isOwnItem) && styles.dim]}>
                <Text style={styles.quickText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          {paymentMethods.length > 0 ? (
            <View style={styles.paymentBox}>
              <Text style={styles.paymentTitle}>Medio de pago</Text>
              {paymentMethods.map((pm) => {
                const selected = pm.id === pmId;
                const available = Number(pm.montoDisponible ?? pm.montoGarantia ?? 0);
                return (
                  <Pressable
                    key={pm.id}
                    onPress={() => setPmId(pm.id)}
                    style={[styles.paymentOption, selected && styles.paymentOptionSelected]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.paymentName, selected && { color: Brand.primary }]} numberOfLines={1}>{methodTitle(pm)}</Text>
                      <Text style={styles.paymentMeta}>{pm.moneda === 'AMBAS' ? 'ARS + USD' : pm.moneda} · disponible {formatMoney(available, pm.moneda === 'USD' ? 'USD' : moneda)}</Text>
                    </View>
                    <Text style={[styles.paymentCheck, selected && { color: Brand.primary }]}>{selected ? '✓' : ''}</Text>
                  </Pressable>
                );
              })}
              {mayApplyFine ? (
                <Text style={styles.fundsWarning}>El monto declarado no cubre el total estimado. Podés pujar igual; si ganás, se aplica una multa del 10%.</Text>
              ) : null}
            </View>
          ) : null}

          {bidError ? <Text style={styles.bidError}>{bidError}</Text> : null}

          {isOwnItem ? (
            <View style={styles.pmNotice}>
              <Text style={styles.pmNoticeText}>Es tu propia pieza: no podés pujar por tu propio ítem.</Text>
            </View>
          ) : isTopBidder ? (
            <View style={styles.pmNotice}>
              <Text style={styles.pmNoticeText}>Sos el mejor postor. Esperá que alguien más puje.</Text>
            </View>
          ) : !canBid && bidNotice ? (
            <View style={styles.pmNotice}>
              <Text style={styles.pmNoticeText}>ℹ️ {bidNotice}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submitBid}
            disabled={!canBid || placing || isTopBidder || isOwnItem}
            style={({ pressed }) => [styles.bidBtn, (!canBid || pressed || placing || isTopBidder || isOwnItem) && styles.dim]}>
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bidBtnText}>
                {isOwnItem ? 'Es tu pieza' : isTopBidder ? 'Mejor postor' : canBid ? `Pujar ${monto ? formatMoney(Number(monto), moneda) : ''}`.trim() : 'No podés pujar'}
              </Text>
            )}
          </Pressable>

          {/* Historial de pujas */}
          <Text style={[styles.section, { marginTop: space.lg }]}>Historial de pujas</Text>
          {bids.length === 0 ? (
            <Text style={styles.muted}>Todavía no hay pujas. ¡Sé el primero!</Text>
          ) : (
            bids.map((b, i) => {
              const mine = (b.userId ?? b.user?.id) === userId;
              return (
                <View key={b.id} style={styles.bidRow}>
                  <View style={styles.bidUser}>
                    <View style={[styles.bidAvatar, mine && styles.bidAvatarMine]}>
                      <Text style={[styles.bidAvatarText, mine && { color: Brand.primary }]}>
                        {mine ? 'TÚ' : 'U'}
                      </Text>
                    </View>
                    <Text style={[styles.bidName, mine && { color: Brand.primary, fontWeight: FontWeight.bold }]}>
                      {mine ? 'Tú' : b.user ? `${b.user.nombre}` : 'Usuario'}
                    </Text>
                  </View>
                  <Text style={[styles.bidAmount, i === 0 && { color: Brand.accent }]}>
                    {formatMoney(b.monto, b.moneda ?? moneda)}
                  </Text>
                </View>
              );
            })
          )}

        </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={abandonar} style={({ pressed }) => [styles.abandonBtn, pressed && styles.dim]}>
              <Text style={styles.abandonText}>Abandonar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  header: {
    backgroundColor: Brand.primaryDark,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { color: '#fff', fontSize: 24, fontWeight: FontWeight.bold },
  headerTitle: { flex: 1, color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  pieceBox: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md, padding: space.md },
  pieceThumb: { width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: 'rgba(255,255,255,0.15)' },
  pieceTextCol: { flex: 1 },
  pieceLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)' },
  pieceTitle: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: '#fff', marginTop: 2 },
  pieceMeta: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  notOpen: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text, textAlign: 'center' },
  body: { padding: space.md, paddingBottom: space.xl },
  notice: {
    backgroundColor: `${Brand.accent}20`,
    borderWidth: 1,
    borderColor: Brand.accent,
    borderRadius: Radius.sm,
    padding: space.md,
    marginBottom: space.md,
  },
  noticeText: { fontSize: FontSize.sm, color: Brand.text, fontWeight: FontWeight.medium },
  timerBox: {
    alignItems: 'center',
    backgroundColor: Brand.primaryDark,
    borderRadius: Radius.md,
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  timerLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  timerValue: { fontSize: 26, fontWeight: FontWeight.bold, color: '#fff', fontVariant: ['tabular-nums'] },
  muted: { fontSize: FontSize.xs, color: Brand.textMuted },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  offerCard: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    padding: space.md,
    alignItems: 'center',
    marginBottom: space.md,
  },
  offerValue: { fontSize: 34, fontWeight: FontWeight.bold, color: Brand.accent, marginTop: 4 },
  minmax: { flexDirection: 'row', gap: space.md, marginTop: space.md, alignItems: 'center' },
  minmaxItem: { alignItems: 'center' },
  minmaxValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  divider: { width: 1, height: 28, backgroundColor: Brand.border },
  section: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.textMuted, marginBottom: space.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.surface,
    borderWidth: 2,
    borderColor: Brand.primary,
    borderRadius: Radius.md,
    paddingHorizontal: space.md,
    height: 56,
    marginBottom: space.sm,
  },
  currency: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Brand.primary, marginRight: space.sm },
  input: { flex: 1, fontSize: 22, fontWeight: FontWeight.bold, color: Brand.primary },
  quickRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  quick: {
    flex: 1,
    height: 38,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.textMuted },
  bidError: { color: Brand.danger, fontSize: FontSize.sm, marginBottom: space.sm },
  paymentBox: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    padding: space.md,
    gap: space.sm,
    marginBottom: space.md,
  },
  paymentTitle: { fontSize: FontSize.xs, color: Brand.textMuted, fontWeight: FontWeight.bold, textTransform: 'uppercase' },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.sm,
    padding: space.sm,
    backgroundColor: Brand.pageBg,
  },
  paymentOptionSelected: { borderColor: Brand.primary, backgroundColor: `${Brand.primary}10` },
  paymentName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Brand.text },
  paymentMeta: { fontSize: FontSize.xs, color: Brand.textMuted, marginTop: 2 },
  paymentCheck: { width: 18, textAlign: 'right', fontSize: FontSize.base, color: Brand.textMuted, fontWeight: FontWeight.bold },
  fundsWarning: { fontSize: FontSize.xs, color: Brand.warning, lineHeight: 17 },
  pmNotice: {
    backgroundColor: `${Brand.warning}1A`,
    borderWidth: 1,
    borderColor: Brand.warning,
    borderRadius: Radius.sm,
    padding: space.md,
    marginBottom: space.sm,
  },
  pmNoticeText: { color: Brand.warning, fontSize: FontSize.sm, lineHeight: 18 },
  bidBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  bidBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  bidUser: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bidAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidAvatarMine: { backgroundColor: `${Brand.primary}20` },
  bidAvatarText: { fontSize: 10, fontWeight: FontWeight.bold, color: Brand.textMuted },
  bidName: { fontSize: FontSize.sm, color: Brand.text },
  bidAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.text },
  liveBody: { flex: 1 },
  scrollArea: { flex: 1 },
  footer: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    backgroundColor: Brand.pageBg,
  },
  abandonBtn: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Brand.danger,
    paddingVertical: 12,
    alignItems: 'center',
  },
  abandonText: { color: Brand.danger, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dim: { opacity: 0.5 },
  wonWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  wonEmoji: { fontSize: 56 },
  wonTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Brand.primary },
  wonPiece: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text, textAlign: 'center' },
  wonMsg: { fontSize: FontSize.sm, color: Brand.textMuted, textAlign: 'center', marginBottom: space.lg, paddingHorizontal: space.md, lineHeight: 20 },
  wonPrimary: { backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingVertical: 14, paddingHorizontal: space.xl, alignItems: 'center', width: '100%' },
  wonPrimaryText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  wonSecondary: { backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, borderRadius: Radius.sm, paddingVertical: 12, paddingHorizontal: space.xl, alignItems: 'center', width: '100%' },
  wonSecondaryText: { color: Brand.text, fontSize: FontSize.base, fontWeight: FontWeight.medium },
});
