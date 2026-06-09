import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { listPaymentMethods } from '@/api/payment-methods';
import { createAuctionSocket } from '@/api/socket';
import { Badge } from '@/components/ui/badge';
import { auctionStatusMeta } from '@/constants/categories';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { calcMaxBid, calcMinBid } from '@/utils/bid-limits';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDate, formatMoney } from '@/utils/format';

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
  const [canBid, setCanBid] = useState(false);
  const [monto, setMonto] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidError, setBidError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [notice, setNotice] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const meIdRef = useRef<string | null>(null);

  // Mejor oferta vigente (o precio base si no hubo pujas).
  const precioBase = item?.precioBase != null ? Number(item.precioBase) : 0;
  const ultimaOferta = mejorOferta ?? precioBase;
  const categoria = auction?.categoria ?? 'comun';
  const min = item ? calcMinBid(precioBase, ultimaOferta, categoria) : 0;
  const max = item ? calcMaxBid(precioBase, ultimaOferta, categoria) : null;
  const moneda = auction?.moneda ?? '';

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
        setBids(history);

        const verified = pms.filter((p) => p.verificado && p.activo);
        // Preferir un medio de pago en la moneda de la subasta.
        const usable = verified.find((p) => p.moneda === a.moneda) ?? verified[0];
        setPmId(usable?.id ?? null);

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
      s.on('bid:new', (payload: { puja: Bid; mejorOferta: number }) => {
        setMejorOferta(Number(payload.mejorOferta));
        setBids((prev) =>
          prev.some((b) => b.id === payload.puja.id) ? prev : [payload.puja, ...prev],
        );
      });
      // Pieza adjudicada (cerrada por el martillero).
      s.on('item:sold', (payload: { closedItemId: string; purchase: { buyerId: string } | null }) => {
        if (!payload.purchase) {
          setNotice('La pieza cerró sin pujas.');
        } else if (payload.purchase.buyerId === meIdRef.current) {
          setNotice('🎉 ¡Ganaste esta pieza! Revisá el resumen de compra.');
        } else {
          setNotice('La pieza fue adjudicada a otro postor.');
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

  const status = auction ? auctionStatusMeta(auction.status) : null;

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
            <Text style={styles.pieceLabel}>Pieza actual #{item.numeroPieza}</Text>
            <Text style={styles.pieceTitle} numberOfLines={1}>
              {item.descripcion}
            </Text>
            <Text style={styles.pieceMeta}>
              {auction?.titulo}
              {item.precioBase != null ? ` · Base: ${formatMoney(item.precioBase, moneda)}` : ''}
            </Text>
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
          <Text style={styles.muted}>No hay ninguna pieza en remate en este momento.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {notice ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
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
              editable={canBid && !placing}
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
                disabled={!canBid}
                style={[styles.quick, !canBid && styles.dim]}>
                <Text style={styles.quickText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          {bidError ? <Text style={styles.bidError}>{bidError}</Text> : null}

          <Pressable
            onPress={submitBid}
            disabled={!canBid || placing}
            style={({ pressed }) => [styles.bidBtn, (!canBid || pressed || placing) && styles.dim]}>
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bidBtnText}>
                {canBid ? `Pujar ${monto ? formatMoney(Number(monto), moneda) : ''}`.trim() : 'No podés pujar'}
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

          <Pressable onPress={abandonar} style={({ pressed }) => [styles.abandonBtn, pressed && styles.dim]}>
            <Text style={styles.abandonText}>Abandonar</Text>
          </Pressable>
        </ScrollView>
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
  pieceBox: { marginTop: space.md, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.md, padding: space.md },
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
  abandonBtn: {
    marginTop: space.xl,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Brand.danger,
    paddingVertical: 12,
    alignItems: 'center',
  },
  abandonText: { color: Brand.danger, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  dim: { opacity: 0.5 },
});
