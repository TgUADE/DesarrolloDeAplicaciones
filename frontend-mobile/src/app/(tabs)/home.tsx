import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  favoriteAuction,
  listAuctions,
  listAuctionsPaged,
  unfavoriteAuction,
  type Auction,
} from '@/api/auctions';
import { getStoredUser, type AuthUser } from '@/api/auth';
import { AuctionCard } from '@/components/ui/auction-card';
import { Badge } from '@/components/ui/badge';
import { StarButton } from '@/components/ui/star-button';
import { auctionStatusMeta, categoryMeta } from '@/constants/categories';
import { Brand, FontSize, FontWeight, Radius, Shadow, space } from '@/constants/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDate, isToday } from '@/utils/format';
import { imageUrl } from '@/utils/media';

type Filter = 'todas' | 'hoy' | 'proximas';
const PILLS: { key: Filter | 'mis'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'hoy', label: 'Hoy' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'mis', label: 'Mis subastas' },
];
const PAGE_SIZE = 10;

export default function HomeSubastas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('todas');

  // Buscador (paginado)
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Auction[]>([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const isSearch = query.trim().length > 0;

  useEffect(() => {
    getStoredUser().then(setUser);
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAuctions(await listAuctions({ limit: 50 }));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar las subastas.'));
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda con debounce
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await listAuctionsPaged({ search: q, page: 1, limit: PAGE_SIZE });
        setResults(res.auctions);
        setTotal(res.total);
        setPage(1);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const loadMore = async () => {
    const next = page + 1;
    try {
      const res = await listAuctionsPaged({ search: query.trim(), page: next, limit: PAGE_SIZE });
      setResults((prev) => [...prev, ...res.auctions]);
      setPage(next);
    } catch {
      // ignorar
    }
  };

  // Actualiza un auction por id en ambas listas.
  const patchAuction = (id: string, patch: Partial<Auction>) => {
    const apply = (arr: Auction[]) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a));
    setAuctions(apply);
    setResults(apply);
  };

  const toggleStar = async (a: Auction) => {
    if (a.participating) return; // bloqueada
    const next = !a.followed;
    patchAuction(a.id, { followed: next });
    try {
      if (next) await favoriteAuction(a.id);
      else await unfavoriteAuction(a.id);
    } catch {
      patchAuction(a.id, { followed: !next }); // revertir
    }
  };

  const openAuction = (a: Auction) =>
    a.status === 'abierta'
      ? router.push({ pathname: '/live/[auctionId]', params: { auctionId: a.id } })
      : router.push({ pathname: '/catalog/[auctionId]', params: { auctionId: a.id } });

  const matchesFilter = (a: Auction) => (filter === 'hoy' ? isToday(a.fechaHora) : true);
  const live = auctions.filter((a) => a.status === 'abierta' && matchesFilter(a));
  const upcoming = auctions.filter((a) => a.status === 'programada' && matchesFilter(a));
  const showLive = filter !== 'proximas';

  const initials = user ? `${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase() : '';
  const cat = categoryMeta(user?.categoria);

  const onPill = (key: Filter | 'mis') => {
    if (key === 'mis') router.push('/mis-subastas');
    else setFilter(key);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: space.xl }}>
        {/* Header azul con borde inferior redondeado */}
        <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.hello}>Hola, {user?.nombre ?? ''}</Text>
              <Text style={styles.headerTitle}>Subastas</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          {user ? (
            <View style={styles.catWrap}>
              <Badge label={`Categoría: ${cat.label}`} color={Brand.accent} />
            </View>
          ) : null}

          {/* Buscador */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar subastas…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Text style={styles.searchClear}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          {!isSearch ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {PILLS.map((p) => {
                const active = p.key === filter;
                return (
                  <Pressable key={p.key} onPress={() => onPill(p.key)} style={[styles.pill, active && styles.pillActive]}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.content}>
          {isSearch ? (
            /* --- Modo búsqueda --- */
            searching && results.length === 0 ? (
              <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
            ) : results.length === 0 ? (
              <Text style={styles.empty}>Sin resultados para “{query.trim()}”.</Text>
            ) : (
              <>
                <Text style={styles.section}>
                  {total} resultado{total === 1 ? '' : 's'}
                </Text>
                {results.map((a) => (
                  <AuctionCard key={a.id} auction={a} onPress={() => openAuction(a)} onToggleStar={() => toggleStar(a)} />
                ))}
                {results.length < total ? (
                  <Pressable onPress={loadMore} style={styles.loadMore}>
                    <Text style={styles.loadMoreText}>Cargar más</Text>
                  </Pressable>
                ) : null}
              </>
            )
          ) : loading ? (
            <ActivityIndicator color={Brand.primary} style={{ marginTop: space.xl }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={load}>
                <Text style={styles.retry}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {showLive && (
                <>
                  <Text style={styles.section}>En vivo ahora</Text>
                  {live.length === 0 ? (
                    <Text style={styles.empty}>No hay subastas en vivo en este momento.</Text>
                  ) : (
                    live.map((a) => (
                      <LiveCard
                        key={a.id}
                        auction={a}
                        onPress={() => router.push({ pathname: '/live/[auctionId]', params: { auctionId: a.id } })}
                        onToggleStar={() => toggleStar(a)}
                      />
                    ))
                  )}
                </>
              )}

              <Text style={[styles.section, { marginTop: space.lg }]}>Próximas subastas</Text>
              {upcoming.length === 0 ? (
                <Text style={styles.empty}>No hay próximas subastas.</Text>
              ) : (
                upcoming.map((a) => (
                  <AuctionCard
                    key={a.id}
                    auction={a}
                    onPress={() => router.push({ pathname: '/catalog/[auctionId]', params: { auctionId: a.id } })}
                    onToggleStar={() => toggleStar(a)}
                  />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Tarjeta destacada de subasta en vivo. */
function LiveCard({
  auction,
  onPress,
  onToggleStar,
}: {
  auction: Auction;
  onPress: () => void;
  onToggleStar?: () => void;
}) {
  const cat = categoryMeta(auction.categoria);
  const status = auctionStatusMeta(auction.status);
  const cover = imageUrl(auction.items?.[0]?.images?.[0]?.url);
  return (
    <View style={styles.liveCard}>
      <View style={styles.liveBanner}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : null}
        <View style={styles.liveBannerOverlay} />
        <Badge label={status.label} color={status.color} />
        <Badge label={cat.label} color={cat.color} />
      </View>
      <View style={styles.liveBody}>
        <View style={styles.liveTitleRow}>
          <Text style={styles.liveTitle} numberOfLines={1}>
            {auction.titulo}
          </Text>
          {onToggleStar ? (
            <StarButton followed={!!auction.followed} locked={!!auction.participating} onToggle={onToggleStar} />
          ) : null}
        </View>
        <Text style={styles.liveMeta}>
          {auction.rematador ? `Martillero: ${auction.rematador.nombre} ${auction.rematador.apellido}` : ''}
        </Text>
        <View style={styles.liveFooter}>
          <View>
            <Text style={styles.liveLabel}>Fecha</Text>
            <Text style={styles.liveValue}>
              {formatDate(auction.fechaHora)} · {auction.moneda}
            </Text>
          </View>
          <Pressable onPress={onPress} style={({ pressed }) => [styles.ingresar, pressed && styles.dim]}>
            <Text style={styles.ingresarText}>Ingresar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  header: {
    backgroundColor: Brand.primary,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  hello: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#fff' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Brand.primaryDark, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  catWrap: { marginTop: space.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.sm,
    paddingHorizontal: space.md,
    height: 42,
    marginTop: space.md,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: '#fff', fontSize: FontSize.sm, paddingVertical: 0 },
  searchClear: { color: 'rgba(255,255,255,0.8)', fontSize: 14, paddingHorizontal: 4 },
  pills: { gap: space.sm, marginTop: space.md, paddingRight: space.lg },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.15)' },
  pillActive: { backgroundColor: '#fff' },
  pillText: { fontSize: FontSize.sm, color: '#fff', fontWeight: FontWeight.medium },
  pillTextActive: { color: Brand.primary },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg },
  section: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text, marginBottom: space.md },
  empty: { fontSize: FontSize.sm, color: Brand.textMuted, marginBottom: space.md },
  loadMore: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: space.lg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    marginTop: space.sm,
  },
  loadMoreText: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  errorBox: { marginTop: space.lg, alignItems: 'center', gap: space.sm },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retry: { color: Brand.primary, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  // Live card
  liveCard: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: space.md,
    ...Shadow.card,
  },
  liveBanner: {
    height: 120,
    backgroundColor: Brand.primaryDark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: space.md,
    overflow: 'hidden',
  },
  liveBannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,52,96,0.28)' },
  liveBody: { padding: space.md, gap: 2 },
  liveTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  liveTitle: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Brand.text },
  liveMeta: { fontSize: FontSize.xs, color: Brand.textMuted },
  liveFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.md },
  liveLabel: { fontSize: FontSize.xs, color: Brand.textMuted },
  liveValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Brand.accent },
  ingresar: { backgroundColor: Brand.primary, borderRadius: Radius.sm, paddingHorizontal: space.lg, paddingVertical: 10 },
  ingresarText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  dim: { opacity: 0.85 },
});
