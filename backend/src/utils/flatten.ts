import { fromSiNo } from './siNo';

/**
 * Helpers para "aplanar" las tablas de extensión (`*_app`) de vuelta a la forma
 * plana que esperan los frontends. La BD guarda los atributos de app en tablas
 * 1:1 y los 'si'/'no' como varchar(2); estos helpers reconstruyen el objeto
 * plano con los nombres de campo originales y los booleans convertidos.
 *
 * Cada helper asume que el `include` trajo `app: true` (y, donde aplica, los
 * `app` anidados).
 */

/** Persona en su forma "lite" (identificador, nombre, apellido [, email]). */
export function flattenPersonaLite(p: any) {
  if (!p) return p;
  const { app, ...rest } = p;
  return {
    ...rest,
    apellido: app?.apellido ?? '',
    ...(app && 'email' in app ? { email: app.email } : {}),
  };
}

export function flattenFoto(f: any) {
  if (!f) return f;
  const { app, ...rest } = f;
  return { ...rest, ...app };
}

export function flattenProducto(p: any) {
  if (!p) return p;
  const { app, fotos, disponible, duenio, ...rest } = p;
  return {
    ...rest,
    ...app,
    disponible: fromSiNo(disponible),
    ...(fotos ? { fotos: fotos.map(flattenFoto) } : {}),
    ...(duenio
      ? { duenio: { ...duenio, ...(duenio.persona ? { persona: flattenPersonaLite(duenio.persona) } : {}) } }
      : {}),
  };
}

export function flattenItem(i: any) {
  if (!i) return i;
  const { app, producto, subastado, ...rest } = i;
  return {
    ...rest,
    ...app,
    subastado: fromSiNo(subastado),
    ...(producto ? { producto: flattenProducto(producto) } : {}),
  };
}

/**
 * Mapea un ItemCatalogo (con `app`, `catalogo`, `producto{app, fotos{app}, duenio{persona}}`)
 * al shape PLANO `Item` que espera frontend-mobile (id + datos del producto al nivel superior).
 * `precioBase` solo se incluye con `includePrice` (usuarios autenticados).
 */
export function mapItem(i: any, opts: { includePrice?: boolean } = {}) {
  if (!i) return null;
  const p = i.producto ?? {};
  const pa = p.app ?? {};
  const owner = p.duenio?.persona;
  const item: any = {
    id: i.identificador?.toString(),
    // El panel admin (frontend/) lee `identificador` (number) y campos crudos; los
    // incluimos junto a la forma plana del mobile para servir ambos clientes.
    identificador: i.identificador,
    productoId: i.productoId,
    ordenEnSubasta: i.app?.ordenEnSubasta ?? null,
    comision: i.comision != null ? Number(i.comision) : undefined,
    numeroPieza: pa.numeroPieza ?? '',
    descripcion: p.descripcionCompleta || p.descripcionCatalogo || '',
    status: i.app?.status ?? null,
    auctionId: i.catalogo?.subastaId != null ? i.catalogo.subastaId.toString() : null,
    esObraDeArte: pa.esObraDeArte ?? false,
    artista: pa.artista ?? null,
    fechaObra: pa.fechaObra ?? null,
    historia: pa.historia ?? null,
    cantidadElementos: pa.cantidadElementos ?? 1,
    descripcionElementos: pa.descripcionElementos ?? null,
    images: (p.fotos ?? []).map((f: any) => ({ id: f.identificador?.toString(), url: f.app?.url ?? null, orden: f.app?.orden ?? 0 })),
    producto: { descripcionCompleta: p.descripcionCompleta ?? null, fotos: (p.fotos ?? []).map((f: any) => ({ url: f.app?.url ?? null })) },
    currentOwner: owner ? { id: owner.identificador?.toString(), nombre: owner.nombre, apellido: owner.app?.apellido ?? '' } : undefined,
    currentOwnerId: owner?.identificador?.toString(),
  };
  if (opts.includePrice) item.precioBase = i.precioBase != null ? String(i.precioBase) : undefined;
  return item;
}
