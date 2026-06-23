import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import client from '@/api/client';
import { getStoredUser } from '@/api/auth';
import { Brand, FontSize, FontWeight, Radius, space } from '@/constants/theme';
import { formatMoney } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/errors';

interface Metrics {
  totalParticipaciones: number;
  totalVictorias: number;
  totalPujos: number;
  totalOfertadoARS: number;
  totalOfertadoUSD: number;
  totalPagadoARS: number;
  totalPagadoUSD: number;
  pujosPorCategoria: { categoria: string; cantidad: number }[];
}

interface AuctionHistoryItem {
  id: string;
  titulo?: string;
  categoria?: string;
  estado?: string;
  fechaHora?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  comun: 'Común',
  especial: 'Especial',
  oro: 'Oro',
  platino: 'Platino',
};

export default function Metricas() {
  const insets = useSafeAreaInsets();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [history, setHistory] = useState<AuctionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await getStoredUser();
        if (!me) return;
        const [mRes, hRes] = await Promise.all([
          client.get(`/users/${me.id}/metrics`),
          client.get(`/users/${me.id}/auction-history`),
        ]);
        setMetrics(mRes.data.data);
        setHistory(hRes.data.data.auctions ?? []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'No se pudieron cargar las métricas.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Métricas</Text>

      {/* ── Sección Métrica ── */}
      <Text style={styles.sectionLabel}>Métrica</Text>
      <View style={styles.card}>
        <StatRow label="Subastas participadas" value={String(metrics?.totalParticipaciones ?? 0)} />
        <Divider />
        <StatRow label="Artículos ganados" value={String(metrics?.totalVictorias ?? 0)} />
        <Divider />
        <StatRow label="Pujas realizadas" value={String(metrics?.totalPujos ?? 0)} />
        <Divider />
        <StatRow label="Total ofertado ARS" value={formatMoney(metrics?.totalOfertadoARS ?? 0, 'ARS')} />
        {(metrics?.totalOfertadoUSD ?? 0) > 0 && (
          <>
            <Divider />
            <StatRow label="Total ofertado USD" value={formatMoney(metrics?.totalOfertadoUSD ?? 0, 'USD')} />
          </>
        )}
        {(metrics?.totalPagadoARS ?? 0) > 0 && (
          <>
            <Divider />
            <StatRow label="Total pagado ARS" value={formatMoney(metrics?.totalPagadoARS ?? 0, 'ARS')} highlight />
          </>
        )}
        {(metrics?.totalPagadoUSD ?? 0) > 0 && (
          <>
            <Divider />
            <StatRow label="Total pagado USD" value={formatMoney(metrics?.totalPagadoUSD ?? 0, 'USD')} highlight />
          </>
        )}
      </View>

      {/* ── Sección Actividades ── */}
      <Text style={styles.sectionLabel}>Actividades</Text>
      <View style={styles.card}>
        <Text style={styles.activityTitle}>Pujas por categoría</Text>
        {(metrics?.pujosPorCategoria ?? []).length === 0 ? (
          <Text style={styles.muted}>Sin actividad aún.</Text>
        ) : (
          metrics!.pujosPorCategoria.map((item) => (
            <View key={item.categoria} style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>{CATEGORY_LABEL[item.categoria] ?? item.categoria}</Text>
              <Text style={styles.categoryCount}>{item.cantidad} puja{item.cantidad !== 1 ? 's' : ''}</Text>
            </View>
          ))
        )}

        <Divider />
        <Text style={[styles.activityTitle, { marginTop: space.sm }]}>Subastas en que participé</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>Todavía no participaste en ninguna subasta.</Text>
        ) : (
          history.map((a) => (
            <View key={a.id} style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {a.titulo ?? `Subasta #${a.id}`}
                </Text>
                <Text style={styles.historyMeta}>
                  {CATEGORY_LABEL[a.categoria ?? ''] ?? a.categoria ?? '—'}
                  {a.estado ? `  ·  ${a.estado}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: space.xl }} />
    </ScrollView>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: Brand.primary }]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.pageBg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.pageBg },
  errorText: { color: Brand.danger, fontSize: FontSize.sm, textAlign: 'center' },

  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Brand.text,
    marginBottom: space.lg,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: space.xs,
    marginTop: space.md,
  },
  card: {
    backgroundColor: Brand.surface,
    borderRadius: Radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.border,
    marginVertical: space.xs,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.xs,
  },
  statLabel: { fontSize: FontSize.sm, color: Brand.textMuted, flex: 1 },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Brand.text },

  activityTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Brand.text,
    marginBottom: space.xs,
  },
  muted: { fontSize: FontSize.sm, color: Brand.textMuted },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  categoryLabel: { fontSize: FontSize.sm, color: Brand.text },
  categoryCount: { fontSize: FontSize.sm, color: Brand.textMuted },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: 6,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.primary,
    marginTop: 5,
  },
  historyTitle: { fontSize: FontSize.sm, color: Brand.text, fontWeight: FontWeight.medium },
  historyMeta: { fontSize: FontSize.xs, color: Brand.textMuted, marginTop: 2 },
});
