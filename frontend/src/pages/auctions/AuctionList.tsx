import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { auctionApi } from '../../api/auction.api';
import { useAuth } from '../../context/AuthContext';

export default function AuctionList() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => auctionApi.list({ status: 'abierta' }),
  });

  const auctions = data?.data?.data?.auctions ?? [];

  if (isLoading) return <p>Cargando subastas...</p>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>Subastas Disponibles</h1>
      {user && <p>Bienvenido, {user.nombre}! Categoría: <strong>{user.categoria}</strong></p>}
      {auctions.length === 0 && <p>No hay subastas abiertas en este momento.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {auctions.map((a: any) => (
          <div key={a.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            <h3>{a.titulo}</h3>
            <p>Categoría: <strong>{a.categoria}</strong></p>
            <p>Moneda: <strong>{a.moneda}</strong></p>
            <p>Fecha: {new Date(a.fechaHora).toLocaleString('es-AR')}</p>
            <p>Ubicación: {a.ubicacion}</p>
            <p>Rematador: {a.rematador?.nombre} {a.rematador?.apellido}</p>
            <p>Ítems: {a._count?.items ?? 0} | Participantes: {a._count?.participants ?? 0}</p>
            <Link to={`/auctions/${a.id}`}>
              <button style={{ width: '100%', padding: 8, marginTop: 8 }}>Ver subasta</button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
