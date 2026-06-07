import { useEffect, useState, useRef, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { auctionApi } from '../../api/auction.api';
import { userApi } from '../../api/user.api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { calcMinBid, calcMaxBid } from '../../utils/bidLimits';

export default function AuctionRoom() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [liveBids, setLiveBids] = useState<any[]>([]);
  const [liveMejorOferta, setLiveMejorOferta] = useState<number | null>(null);
  const [liveItem, setLiveItem] = useState<any>(null);
  const [monto, setMonto] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidPending, setBidPending] = useState(false);
  const [selectedPmId, setSelectedPmId] = useState('');

  const { data: auctionRes } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionApi.getById(id!),
  });

  const { data: currentRes } = useQuery({
    queryKey: ['current-item', id],
    queryFn: () => auctionApi.getCurrentItem(id!),
    refetchInterval: 10000,
  });

  const { data: bidsRes } = useQuery({
    queryKey: ['bids', id],
    queryFn: () => auctionApi.getBids(id!),
  });

  const { data: pmsRes } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: () => userApi.getPaymentMethods(user!.id),
    enabled: !!user,
  });

  // Sync state from queries
  const serverCurrentItem = (currentRes as any)?.data?.data?.item;
  const serverMejorOferta = (currentRes as any)?.data?.data?.mejorOferta;
  const serverBids = (bidsRes as any)?.data?.data?.bids ?? [];

  const currentItem = liveItem ?? serverCurrentItem;
  const mejorOferta = liveMejorOferta ?? (serverMejorOferta ? Number(serverMejorOferta) : null);
  const bids = liveBids.length > 0 ? liveBids : serverBids;

  const auction = (auctionRes as any)?.data?.data;
  const paymentMethods = (pmsRes as any)?.data?.data?.paymentMethods ?? [];

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    const s = io('/', { auth: { token } });
    socketRef.current = s;

    s.emit('join', { auctionId: id });

    s.on('bid:new', (data: any) => {
      setLiveBids(prev => [data.puja, ...prev]);
      setLiveMejorOferta(Number(data.mejorOferta));
      setBidPending(false);
    });

    s.on('item:sold', () => {
      alert('¡Ítem vendido!');
    });

    s.on('auction:item-changed', (data: any) => {
      setLiveItem(data.item);
      setLiveBids([]);
      setLiveMejorOferta(null);
    });

    return () => {
      s.emit('leave', { auctionId: id });
      s.disconnect();
    };
  }, [id, user?.id]);

  const bidMutation = useMutation({
    mutationFn: () => auctionApi.placeBid(id!, { monto: Number(monto), paymentMethodId: selectedPmId }),
    onMutate: () => setBidPending(true),
    onSuccess: () => { setMonto(''); setBidError(''); },
    onError: (err: any) => {
      setBidError(err.response?.data?.error || 'Error al pujar');
      setBidPending(false);
    },
  });

  const precioBase = currentItem?.precioBase ? Number(currentItem.precioBase) : 0;
  const ultimaOferta = mejorOferta ?? precioBase;
  const categoria = auction?.categoria ?? 'comun';
  const moneda = auction?.moneda ?? 'ARS';
  const min = calcMinBid(precioBase, ultimaOferta, categoria);
  const max = calcMaxBid(precioBase, ultimaOferta, categoria);

  const handleBid = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPmId) { setBidError('Seleccioná un medio de pago'); return; }
    const v = Number(monto);
    if (v < min) { setBidError(`Monto mínimo: ${formatCurrency(min, moneda)}`); return; }
    if (max !== null && v > max) { setBidError(`Monto máximo: ${formatCurrency(max, moneda)}`); return; }
    setBidError('');
    bidMutation.mutate();
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <Link to={`/auctions/${id}`}>← Volver</Link>
      <h1>{auction?.titulo ?? 'Subasta en vivo'}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div>
          {currentItem ? (
            <div style={{ border: '2px solid #007bff', borderRadius: 8, padding: 20 }}>
              <h2>Ítem actual: #{currentItem.numeroPieza}</h2>
              <p>{currentItem.descripcion}</p>
              {currentItem.esObraDeArte && <p><em>Artista: {currentItem.artista}</em></p>}
              <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666' }}>Precio base</div>
                  <div style={{ fontSize: 20 }}>{formatCurrency(precioBase, moneda)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666' }}>Mejor oferta</div>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#007bff' }}>
                    {mejorOferta ? formatCurrency(mejorOferta, moneda) : 'Sin ofertas'}
                  </div>
                </div>
              </div>

              <form onSubmit={handleBid} style={{ marginTop: 20 }}>
                <div style={{ marginBottom: 8 }}>
                  <label>Medio de pago<br />
                    <select value={selectedPmId} onChange={e => setSelectedPmId(e.target.value)}
                      style={{ width: '100%', padding: 8 }}>
                      <option value="">Seleccionar...</option>
                      {paymentMethods.filter((p: any) => p.verificado).map((pm: any) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.tipo.replace(/_/g, ' ')} - {pm.moneda}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>
                    Monto ({moneda}) — Mín: {formatCurrency(min, moneda)}
                    {max !== null && ` — Máx: ${formatCurrency(max, moneda)}`}
                    <br />
                    <input type="number" step="0.01" value={monto}
                      onChange={e => setMonto(e.target.value)}
                      style={{ width: '100%', padding: 8 }} />
                  </label>
                </div>
                {bidError && <p style={{ color: 'red' }}>{bidError}</p>}
                <button type="submit" disabled={bidPending || bidMutation.isPending}
                  style={{ width: '100%', padding: 12, background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>
                  {bidPending ? '⏳ Confirmando...' : '¡Pujar!'}
                </button>
                {paymentMethods.filter((p: any) => p.verificado).length === 0 && (
                  <p style={{ color: 'orange' }}>
                    No tenés medios de pago verificados. <Link to="/profile/payment-methods">Agregar →</Link>
                  </p>
                )}
              </form>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', background: '#f8f9fa', borderRadius: 8 }}>
              <p>Esperando inicio de la subasta...</p>
            </div>
          )}
        </div>

        <div>
          <h3>Historial de pujas</h3>
          <div style={{ height: 400, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 8 }}>
            {bids.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>Sin pujas</p>}
            {bids.map((bid: any, i: number) => (
              <div key={bid.id ?? i} style={{
                padding: '8px 0', borderBottom: '1px solid #f0f0f0',
                background: bid.userId === user?.id ? '#e8f5e9' : 'white',
              }}>
                <div style={{ fontWeight: 'bold' }}>{formatCurrency(Number(bid.monto), moneda)}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {bid.user?.nombre} {bid.user?.apellido}
                  {bid.userId === user?.id && ' (vos)'}
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {new Date(bid.createdAt).toLocaleTimeString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
