import { useEffect, useState } from 'react';
import {
  getAuctions,
  getAuctioneers,
  createAuction,
  startAuction,
  setAuctionStatus,
  getAuctionItems,
  startItem,
  closeAuctionItem,
  setItemLocation,
  getAvailableItems,
  addAuctionItem,
  getCatalogs,
  createCatalog,
  getCatalogItems,
  addCatalogItem,
  assignCatalogToAuction,
  imageUrl,
  type Auction,
  type Auctioneer,
  type AuctionItem,
  type AdminProducto,
  type AdminCatalog,
} from '../api';

const STATUS_BADGE: Record<string, string> = {
  programada: 'badge-blue',
  abierta: 'badge-green',
  cerrada: 'badge-gray',
  finalizada: 'badge-gray',
  cancelada: 'badge-red',
};

const ITEM_BADGE: Record<string, string> = {
  en_catalogo: 'badge-yellow',
  en_subasta: 'badge-blue',
  vendido: 'badge-green',
  sin_venta: 'badge-gray',
};

// Categorías = tiers de acceso (deben coincidir con el enum del backend / CHECK).
const CATEGORIAS = ['comun', 'especial', 'plata', 'oro', 'platino'];

export default function Auctions() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [catalogs, setCatalogs] = useState<AdminCatalog[]>([]);
  const [auctioneers, setAuctioneers] = useState<Auctioneer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Items modal state
  const [itemsFor, setItemsFor] = useState<Auction | null>(null);
  const [catalogItemsFor, setCatalogItemsFor] = useState<AdminCatalog | null>(null);
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemBusy, setItemBusy] = useState<number | null>(null);

  // Depósito de un ítem
  const [locItem, setLocItem] = useState<AuctionItem | null>(null);
  const [locForm, setLocForm] = useState({ deposito: '', ubicacion: '' });
  const [locSaving, setLocSaving] = useState(false);

  // Agregar piezas disponibles al catálogo
  const [adding, setAdding] = useState(false);
  const [available, setAvailable] = useState<AdminProducto[]>([]);
  const [availOther, setAvailOther] = useState(0); // piezas disponibles en OTRA moneda
  const [availLoading, setAvailLoading] = useState(false);
  const [priceById, setPriceById] = useState<Record<number, string>>({});
  const [addBusy, setAddBusy] = useState<number | null>(null);

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fechaHora: '',
    ubicacion: '',
    categoria: 'comun', // tier de acceso (no tipo de objeto)
    moneda: 'ARS',
    rematadorId: '',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [aData, rData, cData] = await Promise.all([getAuctions(), getAuctioneers(), getCatalogs()]);
      setAuctions(aData.auctions);
      setAuctioneers(rData.auctioneers);
      setCatalogs(cData.catalogs);
      if (!form.rematadorId && rData.auctioneers.length > 0) {
        setForm((f) => ({ ...f, rematadorId: rData.auctioneers[0].id }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createAuction(form);
      setShowCreate(false);
      setForm((f) => ({ ...f, titulo: '', descripcion: '', fechaHora: '', ubicacion: '' }));
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear subasta');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCatalog = async () => {
    const descripcion = prompt('Descripción del catálogo');
    if (!descripcion?.trim()) return;
    setError('');
    try {
      await createCatalog({ descripcion: descripcion.trim() });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear catálogo');
    }
  };

  const openCatalogItems = async (c: AdminCatalog) => {
    setCatalogItemsFor(c);
    setItemsFor(null);
    setItemsLoading(true);
    setItems([]);
    try {
      const data = await getCatalogItems(c.id);
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar ítems del catálogo');
    } finally {
      setItemsLoading(false);
    }
  };

  const refreshCatalogItems = async (catalogId: string) => {
    const [cData, iData] = await Promise.all([getCatalogs(), getCatalogItems(catalogId)]);
    setCatalogs(cData.catalogs);
    setItems(iData.items);
    const updated = cData.catalogs.find((x) => x.id === catalogId);
    if (updated) setCatalogItemsFor(updated);
  };

  const handleAssignCatalog = async (c: AdminCatalog) => {
    const candidates = auctions.filter((a) => a.status === 'programada');
    const hint = candidates.map((a) => '#' + a.id + ' ' + a.titulo + ' (' + (a.moneda ?? 'ARS') + ')').join('\n');
    const auctionId = prompt('ID de subasta programada para asignar este catálogo:\n' + hint);
    if (!auctionId) return;
    setError('');
    try {
      await assignCatalogToAuction(c.id, auctionId.trim());
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al asignar catálogo');
    }
  };

  const handleOpen = async (a: Auction) => {
    if (!confirm(`¿Abrir la subasta "${a.titulo}"? Pasará a estado "abierta" y los usuarios podrán pujar.`)) return;
    try {
      await startAuction(a.id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al abrir');
    }
  };

  const handleClose = async (a: Auction) => {
    if (!confirm(`¿Cerrar la subasta "${a.titulo}"?`)) return;
    try {
      await setAuctionStatus(a.id, 'cerrada');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cerrar');
    }
  };

  // ── Items ───────────────────────────────────────────
  const openItems = async (a: Auction) => {
    setItemsFor(a);
    setCatalogItemsFor(null);
    setItemsLoading(true);
    setItems([]);
    try {
      const data = await getAuctionItems(a.id);
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar ítems');
    } finally {
      setItemsLoading(false);
    }
  };

  const refreshItemsAndAuction = async (auctionId: string) => {
    const [aData, iData] = await Promise.all([getAuctions(), getAuctionItems(auctionId)]);
    setAuctions(aData.auctions);
    setItems(iData.items);
    const updated = aData.auctions.find((x) => x.id === auctionId);
    if (updated) setItemsFor(updated);
  };

  const handleStartItem = async (item: AuctionItem) => {
    if (!itemsFor) return;
    setItemBusy(item.identificador);
    setError('');
    try {
      await startItem(itemsFor.id, item.identificador);
      await refreshItemsAndAuction(itemsFor.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar ítem');
    } finally {
      setItemBusy(null);
    }
  };

  const handleCloseItem = async (item: AuctionItem) => {
    if (!itemsFor) return;
    if (!confirm('¿Cerrar el remate de este ítem y adjudicarlo al mejor postor?')) return;
    setItemBusy(item.identificador);
    setError('');
    try {
      await closeAuctionItem(itemsFor.id, item.identificador);
      await refreshItemsAndAuction(itemsFor.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cerrar ítem');
    } finally {
      setItemBusy(null);
    }
  };

  const openLoc = (it: AuctionItem) => {
    setLocItem(it);
    setLocForm({ deposito: '', ubicacion: '' });
  };

  const saveLoc = async () => {
    if (!locItem) return;
    setLocSaving(true);
    setError('');
    try {
      if (locForm.deposito || locForm.ubicacion) await setItemLocation(locItem.productoId, locForm.deposito, locForm.ubicacion);
      setLocItem(null);
      if (itemsFor) await refreshItemsAndAuction(itemsFor.id);
      if (catalogItemsFor) await refreshCatalogItems(catalogItemsFor.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setLocSaving(false);
    }
  };

  const openAdd = async () => {
    setAdding(true);
    setAvailLoading(true);
    setError('');
    try {
      const targetMoneda = itemsFor?.moneda ?? catalogItemsFor?.moneda ?? undefined;
      const [data, all] = await Promise.all([getAvailableItems(targetMoneda), getAvailableItems()]);
      setAvailable(data.items);
      setAvailOther(targetMoneda ? all.items.length - data.items.length : 0); // disponibles en otra moneda
      const prices: Record<number, string> = {};
      for (const p of data.items) prices[p.identificador] = p.seguro?.importe != null ? String(Math.round(Number(p.seguro.importe))) : '';
      setPriceById(prices);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setAvailLoading(false);
    }
  };

  const doAdd = async (p: AdminProducto) => {
    if (!itemsFor && !catalogItemsFor) return;
    const pb = Number(priceById[p.identificador] || p.seguro?.importe || 0);
    if (!pb || pb <= 0.01) { setError('Ingresá un precio base válido.'); return; }
    setAddBusy(p.identificador);
    setError('');
    try {
      const comision = Math.max(1, Math.round(pb * 0.05));
      if (itemsFor) {
        await addAuctionItem(itemsFor.id, p.identificador, pb, comision);
        await refreshItemsAndAuction(itemsFor.id);
      } else if (catalogItemsFor) {
        await addCatalogItem(catalogItemsFor.id, p.identificador, pb, comision);
        await refreshCatalogItems(catalogItemsFor.id);
      }
      await openAdd();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al agregar la pieza');
    } finally {
      setAddBusy(null);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const money = (n?: number | string | null, cur = 'ARS') =>
    n != null && n !== '' ? Number(n).toLocaleString('es-AR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }) : '—';

  const activeItemsTitle = itemsFor?.titulo ?? catalogItemsFor?.descripcion ?? '';
  const activeItemsMoneda = itemsFor?.moneda ?? catalogItemsFor?.moneda ?? undefined;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Subastas</h1>
          <p>{auctions.length} subasta{auctions.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleCreateCatalog}>+ Nuevo catálogo</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nueva subasta</button>
        </div>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Catálogos</h2>
          <span style={{ color: '#64748b', fontSize: 12 }}>{catalogs.length} catálogo{catalogs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="spinner">Cargando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Subasta</th>
                  <th>Ítems</th>
                  <th>Moneda</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {catalogs.length === 0 ? (
                  <tr className="empty-row"><td colSpan={7}>No hay catálogos</td></tr>
                ) : catalogs.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: '#94a3b8' }}>#{c.id}</td>
                    <td><strong>{c.descripcion}</strong></td>
                    <td><span className={'badge ' + (c.status === 'borrador' ? 'badge-yellow' : 'badge-blue')}>{c.status}</span></td>
                    <td>{c.subastaTitulo ?? 'Sin subasta'}</td>
                    <td>{c.itemCount}</td>
                    <td>{c.moneda ?? '—'}</td>
                    <td>
                      <div className="action-row">
                        <button className="btn btn-sm btn-secondary" onClick={() => openCatalogItems(c)}>Ítems</button>
                        {c.status === 'borrador' && (
                          <button className="btn btn-sm btn-primary" disabled={c.itemCount === 0} onClick={() => handleAssignCatalog(c)}>Asignar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Subastas</h2>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="spinner">Cargando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Título</th>
                  <th>Categoría</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {auctions.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>No hay subastas</td></tr>
                ) : (
                  auctions.map((a) => (
                    <tr key={a.id}>
                      <td style={{ color: '#94a3b8' }}>#{a.id}</td>
                      <td><strong>{a.titulo}</strong></td>
                      <td><span className="badge badge-gray">{a.categoria}</span></td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{fmtDate(a.fechaHora)}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[a.status] ?? 'badge-gray'}`}>
                          {a.status?.replace('_', ' ') ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div className="action-row">
                          <button className="btn btn-sm btn-secondary" onClick={() => openItems(a)}>
                            📦 Ítems
                          </button>
                          {a.status === 'programada' && (
                            <button className="btn btn-sm btn-success" onClick={() => handleOpen(a)}>
                              ▶ Abrir subasta
                            </button>
                          )}
                          {a.status === 'abierta' && (
                            <button className="btn btn-sm btn-warning" onClick={() => handleClose(a)}>
                              ⏹ Cerrar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Items modal */}
      {itemsFor && (
        <div className="modal-overlay" onClick={() => setItemsFor(null)}>
          <div className="modal" style={{ width: 680 }} onClick={(e) => e.stopPropagation()}>
            <h2>📦 Ítems — {itemsFor.titulo}</h2>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Estado:</span>
              <span className={`badge ${STATUS_BADGE[itemsFor.status] ?? 'badge-gray'}`}>
                {itemsFor.status?.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                · {items.length} ítem{items.length !== 1 ? 's' : ''}{itemsFor.moneda ? ` · ${itemsFor.moneda}` : ''}
              </span>
            </div>

            {(itemsFor.status === 'programada' || itemsFor.status === 'abierta') && (
              <button className="btn btn-sm btn-primary" style={{ marginBottom: 12 }} onClick={openAdd}>➕ Agregar pieza al catálogo</button>
            )}

            {itemsFor.status === 'programada' && (
              <div className="error-banner" style={{ background: '#fef3c7', color: '#92400e' }}>
                La subasta está <strong>programada</strong>. Debés abrirla para poder iniciar el remate de los ítems.
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-sm btn-success" onClick={() => handleOpen(itemsFor)}>▶ Abrir subasta ahora</button>
                </div>
              </div>
            )}

            <div className="table-wrap">
              {itemsLoading ? (
                <div className="spinner">Cargando ítems...</div>
              ) : items.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>
                  Esta subasta no tiene ítems en el catálogo.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Artículo</th>
                      <th>Precio base</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const isCurrent = itemsFor.currentItemId === it.identificador;
                      const canStart =
                        itemsFor.status === 'abierta' &&
                        it.status === 'en_subasta' &&
                        !itemsFor.currentItemId;
                      const thumb = imageUrl(it.producto?.fotos?.[0]?.url ?? undefined);
                      return (
                        <tr key={it.identificador} style={isCurrent ? { background: '#ecfdf5' } : undefined}>
                          <td style={{ color: '#94a3b8' }}>{it.ordenEnSubasta}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {thumb ? (
                                <img src={thumb} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 40, height: 40, borderRadius: 6, background: '#e2e8f0', flexShrink: 0 }} />
                              )}
                              <div>
                                <strong>{it.producto?.descripcionCompleta ?? `Ítem #${it.identificador}`}</strong>
                                {it.numeroPieza ? <div style={{ fontSize: 11, color: '#94a3b8' }}>#{it.numeroPieza}</div> : null}
                                {isCurrent && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>● En remate ahora</div>}
                              </div>
                            </div>
                          </td>
                          <td><strong>{money(it.precioBase, itemsFor.moneda)}</strong></td>
                          <td>
                            <span className={`badge ${ITEM_BADGE[it.status] ?? 'badge-gray'}`}>
                              {it.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div className="action-row">
                              {isCurrent ? (
                                <button
                                  className="btn btn-sm btn-warning"
                                  disabled={itemBusy === it.identificador}
                                  onClick={() => handleCloseItem(it)}>
                                  {itemBusy === it.identificador ? '...' : '⏹ Cerrar ítem'}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm btn-success"
                                  disabled={!canStart || itemBusy != null}
                                  title={
                                    itemsFor.status !== 'abierta'
                                      ? 'La subasta debe estar abierta'
                                      : itemsFor.currentItemId
                                      ? 'Ya hay un ítem en remate'
                                      : it.status !== 'en_subasta'
                                      ? 'El ítem ya fue rematado'
                                      : ''
                                  }
                                  onClick={() => handleStartItem(it)}>
                                  {itemBusy === it.identificador ? '...' : '▶ Iniciar'}
                                </button>
                              )}
                              <button className="btn btn-sm btn-secondary" title="Asignar depósito" onClick={() => openLoc(it)}>📍 Depósito</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setItemsFor(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog items modal */}
      {catalogItemsFor && (
        <div className="modal-overlay" onClick={() => setCatalogItemsFor(null)}>
          <div className="modal" style={{ width: 680 }} onClick={(e) => e.stopPropagation()}>
            <h2>Ítems — {catalogItemsFor.descripcion}</h2>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={'badge ' + (catalogItemsFor.status === 'borrador' ? 'badge-yellow' : 'badge-blue')}>
                {catalogItemsFor.status}
              </span>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                · {items.length} ítem{items.length !== 1 ? 's' : ''}{catalogItemsFor.moneda ? ` · ${catalogItemsFor.moneda}` : ''}
              </span>
              {catalogItemsFor.subastaTitulo ? <span style={{ fontSize: 13, color: '#64748b' }}>· {catalogItemsFor.subastaTitulo}</span> : null}
            </div>

            {catalogItemsFor.status === 'borrador' && (
              <button className="btn btn-sm btn-primary" style={{ marginBottom: 12 }} onClick={openAdd}>+ Agregar pieza al catálogo</button>
            )}

            <div className="table-wrap">
              {itemsLoading ? (
                <div className="spinner">Cargando ítems...</div>
              ) : items.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>
                  Este catálogo todavía no tiene ítems.
                </p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Artículo</th>
                      <th>Precio base</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const thumb = imageUrl(it.producto?.fotos?.[0]?.url ?? undefined);
                      return (
                        <tr key={it.identificador}>
                          <td style={{ color: '#94a3b8' }}>{it.ordenEnSubasta}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {thumb ? (
                                <img src={thumb} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 40, height: 40, borderRadius: 6, background: '#e2e8f0', flexShrink: 0 }} />
                              )}
                              <div>
                                <strong>{it.producto?.descripcionCompleta ?? `Ítem #${it.identificador}`}</strong>
                                {it.numeroPieza ? <div style={{ fontSize: 11, color: '#94a3b8' }}>#{it.numeroPieza}</div> : null}
                              </div>
                            </div>
                          </td>
                          <td><strong>{money(it.precioBase, catalogItemsFor.moneda ?? 'ARS')}</strong></td>
                          <td>
                            <span className={`badge ${ITEM_BADGE[it.status] ?? 'badge-gray'}`}>
                              {it.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-secondary" title="Asignar depósito" onClick={() => openLoc(it)}>Depósito</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-actions">
              {catalogItemsFor.status === 'borrador' && catalogItemsFor.itemCount > 0 && (
                <button className="btn btn-primary" onClick={() => handleAssignCatalog(catalogItemsFor)}>Asignar a subasta</button>
              )}
              <button className="btn btn-secondary" onClick={() => setCatalogItemsFor(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Agregar pieza disponible al catálogo */}
      {adding && (itemsFor || catalogItemsFor) && (
        <div className="modal-overlay" onClick={() => setAdding(false)}>
          <div className="modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
            <h2>Agregar pieza — {activeItemsTitle}</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: -8, marginBottom: 12 }}>
              Piezas aceptadas y disponibles (sin asignar a otro catálogo), <strong>solo en {activeItemsMoneda ?? 'la moneda del catálogo'}</strong> El precio base sugerido es el del seguro.
            </p>
            {availLoading ? (
              <div className="spinner">Cargando...</div>
            ) : available.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                No hay piezas disponibles{activeItemsMoneda ? ` en ${activeItemsMoneda}` : ''}. Aceptá solicitudes de venta en esa moneda para generar piezas.
                {availOther > 0 && (
                  <><br /><br />💡 Hay {availOther} pieza{availOther !== 1 ? 's' : ''} disponible{availOther !== 1 ? 's' : ''} en <strong>otra moneda</strong>. Como el destino es en {activeItemsMoneda}, solo entran piezas en {activeItemsMoneda}. Para esas piezas, creá/usá una subasta de su moneda.</>
                )}
              </p>
            ) : (
              <div className="table-wrap" style={{ maxHeight: 360, overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Pieza</th><th>Dueño</th><th>Precio base</th><th></th></tr>
                  </thead>
                  <tbody>
                    {available.map((p) => {
                      const thumb = imageUrl(p.fotos?.[0]?.url ?? undefined);
                      return (
                        <tr key={p.identificador}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {thumb ? (
                                <img src={thumb} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 6, background: '#e2e8f0', flexShrink: 0 }} />
                              )}
                              <div>
                                <strong>{p.descripcionCompleta}</strong>
                                {p.numeroPieza ? <div style={{ fontSize: 11, color: '#94a3b8' }}>#{p.numeroPieza}</div> : null}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{p.duenio?.persona ? `${p.duenio.persona.nombre} ${p.duenio.persona.apellido}` : '—'}</td>
                          <td>
                            <input
                              type="number"
                              style={{ width: 110, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                              value={priceById[p.identificador] ?? ''}
                              onChange={(e) => setPriceById((m) => ({ ...m, [p.identificador]: e.target.value }))}
                              placeholder="precio"
                            />
                          </td>
                          <td>
                            <button className="btn btn-sm btn-success" disabled={addBusy === p.identificador} onClick={() => doAdd(p)}>
                              {addBusy === p.identificador ? '...' : 'Agregar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Depósito modal */}
      {locItem && (
        <div className="modal-overlay" onClick={() => setLocItem(null)}>
          <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <h2>📍 Depósito</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: -8, marginBottom: 12 }}>
              {locItem.producto?.descripcionCompleta ?? `Ítem #${locItem.identificador}`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Depósito</label>
                <input value={locForm.deposito} onChange={(e) => setLocForm((f) => ({ ...f, deposito: e.target.value }))} placeholder="Ej: Depósito Central" />
              </div>
              <div className="form-group">
                <label>Ubicación</label>
                <input value={locForm.ubicacion} onChange={(e) => setLocForm((f) => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej: Estante A-12" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={saveLoc} disabled={locSaving}>{locSaving ? 'Guardando...' : '💾 Guardar'}</button>
              <button className="btn btn-secondary" onClick={() => setLocItem(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <h2>🔨 Nueva subasta</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Título</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Gran Subasta de Arte Contemporáneo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Descripción de la subasta..."
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={form.fechaHora}
                    onChange={(e) => setForm((f) => ({ ...f, fechaHora: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select value={form.moneda} onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}>
                    <option value="ARS">ARS — Peso argentino</option>
                    <option value="USD">USD — Dólar</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Ubicación</label>
                <input
                  value={form.ubicacion}
                  onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                  placeholder="Ej: Buenos Aires, Argentina"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Categoría</label>
                  <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Rematador</label>
                  <select value={form.rematadorId} onChange={(e) => setForm((f) => ({ ...f, rematadorId: e.target.value }))} required>
                    {auctioneers.length === 0
                      ? <option value="">Sin rematadores</option>
                      : auctioneers.map((r) => (
                          <option key={r.id} value={r.id}>{r.nombre} {r.apellido} — {r.matricula}</option>
                        ))
                    }
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creando...' : 'Crear subasta'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
