import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auctionApi } from '../../api/auction.api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatCurrency';

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: auctionData } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionApi.getById(id!),
  });

  const { data: catalogData } = useQuery({
    queryKey: ['catalog', id],
    queryFn: () => auctionApi.getCatalog(id!),
  });

  const joinMutation = useMutation({
    mutationFn: () => auctionApi.join(id!),
    onSuccess: () => navigate(`/auctions/${id}/room`),
    onError: (err: any) => alert(err.response?.data?.error || 'Error al unirse'),
  });

  const auction = (auctionData as any)?.data?.data;
  const items = (catalogData as any)?.data?.data?.items ?? [];

  if (!auction) return <p>Cargando...</p>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <Link to="/auctions">← Volver</Link>
      <h1>{auction.titulo}</h1>
      <p>{auction.descripcion}</p>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        <div><strong>Categoría:</strong> {auction.categoria}</div>
        <div><strong>Moneda:</strong> {auction.moneda}</div>
        <div><strong>Estado:</strong> {auction.status}</div>
        <div><strong>Fecha:</strong> {new Date(auction.fechaHora).toLocaleString('es-AR')}</div>
        <div><strong>Ubicación:</strong> {auction.ubicacion}</div>
        <div><strong>Rematador:</strong> {auction.rematador?.nombre} {auction.rematador?.apellido}</div>
      </div>

      {user && auction.status === 'abierta' && (
        <button
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          style={{ padding: '10px 24px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          {joinMutation.isPending ? 'Uniéndose...' : 'Unirse a la subasta en vivo'}
        </button>
      )}

      <h2 style={{ marginTop: 32 }}>Catálogo ({items.length} ítems)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {items.map((item: any) => (
          <div key={item.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
            {item.images?.[0] && (
              <img src={item.images[0].url} alt={item.descripcion}
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} />
            )}
            <p><strong>#{item.numeroPieza}</strong></p>
            <p>{item.descripcion}</p>
            {item.esObraDeArte && <p><em>{item.artista}</em></p>}
            {'precioBase' in item && (
              <p>Base: <strong>{formatCurrency(item.precioBase, auction.moneda)}</strong></p>
            )}
            {!('precioBase' in item) && <p><em>Precio base visible para usuarios registrados</em></p>}
            <Link to={`/items/${item.id}`}><small>Ver detalle →</small></Link>
          </div>
        ))}
      </div>
    </div>
  );
}
