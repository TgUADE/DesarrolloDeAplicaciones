import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auctionApi } from '../../api/auction.api';
import { adminApi } from '../../api/admin.api';
import { formatCurrency } from '../../utils/formatCurrency';

export default function AdminAuctionRoom() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: auctionData } = useQuery({ queryKey: ['auction', id], queryFn: () => auctionApi.getById(id!) });
  const { data: currentData, refetch } = useQuery({ queryKey: ['current-item', id], queryFn: () => auctionApi.getCurrentItem(id!), refetchInterval: 5000 });
  const { data: bidsData } = useQuery({ queryKey: ['bids', id], queryFn: () => auctionApi.getBids(id!), refetchInterval: 3000 });
  const { data: catalogData } = useQuery({ queryKey: ['catalog', id], queryFn: () => auctionApi.getCatalog(id!) });

  const addItemMutation = useMutation({
    mutationFn: (itemId: string) => adminApi.addItemToAuction(id!, itemId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog', id] }); },
    onError: (err: any) => alert(err.response?.data?.error),
  });

  const closeItemMutation = useMutation({
    mutationFn: (itemId: string) => adminApi.closeItem(id!, itemId),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['bids', id] }); },
    onError: (err: any) => alert(err.response?.data?.error),
  });

  const auction = auctionData?.data?.data;
  const currentItem = currentData?.data?.data?.item;
  const mejorOferta = currentData?.data?.data?.mejorOferta;
  const bids = bidsData?.data?.data?.bids ?? [];
  const items = catalogData?.data?.data?.items ?? [];
  const moneda = auction?.moneda ?? 'ARS';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <Link to="/admin/auctions">← Volver a subastas</Link>
      <h1>Control de Sala: {auction?.titulo}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div>
          {currentItem ? (
            <div style={{ border: '2px solid #007bff', borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <h2>Ítem activo: #{currentItem.numeroPieza}</h2>
              <p>{currentItem.descripcion}</p>
              {mejorOferta && <p>Mejor oferta: <strong>{formatCurrency(Number(mejorOferta), moneda)}</strong></p>}
              <button onClick={() => closeItemMutation.mutate(currentItem.id)}
                disabled={closeItemMutation.isPending}
                style={{ padding: '10px 24px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 12 }}>
                {closeItemMutation.isPending ? 'Cerrando...' : '🔨 Cerrar puja y adjudicar'}
              </button>
            </div>
          ) : <div style={{ padding: 40, background: '#f8f9fa', borderRadius: 8, textAlign: 'center' }}><p>No hay ítem activo</p></div>}

          <h3>Catálogo</h3>
          {items.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #eee', borderRadius: 4, marginBottom: 4 }}>
              <span>#{item.numeroPieza} - {item.descripcion?.slice(0, 50)}</span>
              <span style={{ color: '#666', fontSize: 12 }}>{item.status}</span>
            </div>
          ))}
        </div>
        <div>
          <h3>Pujas en tiempo real</h3>
          <div style={{ height: 500, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
            {bids.map((bid: any) => (
              <div key={bid.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 'bold' }}>{formatCurrency(Number(bid.monto), moneda)}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{bid.user?.nombre} {bid.user?.apellido}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
