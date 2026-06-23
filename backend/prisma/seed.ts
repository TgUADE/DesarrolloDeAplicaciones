import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deben coincidir con las constantes en src/utils/systemEmpleado.ts
const SYSTEM_EMPLEADO_EMAIL = 'sistema@subastas.com';
const EMPRESA_CLIENTE_EMAIL = 'empresa@subastas.com';
const DAY = 24 * 60 * 60 * 1000;

// Imágenes temáticas (Unsplash, IDs verificados) por número de pieza, para que el
// catálogo se vea profesional. Cada pieza tiene una galería acorde a su categoría.
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;
const IMG = {
  artOil: U('1579783902614-a3fb3927b6a5'),
  artWatercolor: U('1517999144091-3d9dca6d1e43'),
  artWatercolor2: U('1460661419201-fd4cecdf8a8b'),
  artSculpture: U('1554907984-15263bfd63bd'),
  artEngraving: U('1577083552431-6e5fd01aa342'),
  artEngraving2: U('1578926375605-eaf7559b1458'),
  antiqueClock: U('1501139083538-0139583c060f'),
  antiqueChairs: U('1567016432779-094069958ea5'),
  antiqueMirror: U('1618220179428-22790b461013'),
  jewelWatch: U('1523275335684-37898b6baf30'),
  jewelPearls: U('1599643478518-a784e5dc4c8f'),
  wineRed: U('1510812431401-41d2bd2722f3'),
  wineWhisky: U('1569529465841-dfecdab7503b'),
  wineChampagne: U('1510626176961-4b57d4fbad03'),
};
// Galería por pieza: la primera es la imagen principal (la que se ve en las cards).
const FOTOS_POR_PIEZA: Record<string, string[]> = {
  'A1-001': [IMG.artOil, IMG.artWatercolor, IMG.artSculpture, IMG.artEngraving, IMG.artWatercolor2, IMG.artEngraving2],
  'A1-002': [IMG.artWatercolor, IMG.artWatercolor2, IMG.artOil, IMG.artSculpture, IMG.artEngraving, IMG.artEngraving2],
  'A1-003': [IMG.artSculpture, IMG.artOil, IMG.artEngraving, IMG.artWatercolor, IMG.artEngraving2, IMG.artWatercolor2],
  'A2-001': [IMG.antiqueClock, IMG.antiqueChairs, IMG.antiqueMirror, IMG.antiqueClock, IMG.antiqueChairs, IMG.antiqueMirror],
  'A2-002': [IMG.antiqueChairs, IMG.antiqueMirror, IMG.antiqueClock, IMG.antiqueChairs, IMG.antiqueMirror, IMG.antiqueClock],
  'A2-003': [IMG.antiqueMirror, IMG.antiqueClock, IMG.antiqueChairs, IMG.antiqueMirror, IMG.antiqueClock, IMG.antiqueChairs],
  'A3-001': [IMG.jewelWatch, IMG.jewelPearls, IMG.jewelWatch, IMG.jewelPearls, IMG.jewelWatch, IMG.jewelPearls],
  'A3-002': [IMG.jewelPearls, IMG.jewelWatch, IMG.jewelPearls, IMG.jewelWatch, IMG.jewelPearls, IMG.jewelWatch],
  'A4-001': [IMG.wineRed, IMG.wineWhisky, IMG.wineChampagne, IMG.wineRed, IMG.wineWhisky, IMG.wineChampagne],
  'A4-002': [IMG.wineWhisky, IMG.wineChampagne, IMG.wineRed, IMG.wineWhisky, IMG.wineChampagne, IMG.wineRed],
  'A4-003': [IMG.wineChampagne, IMG.wineRed, IMG.wineWhisky, IMG.wineChampagne, IMG.wineRed, IMG.wineWhisky],
  'A5-001': [IMG.artEngraving, IMG.artOil, IMG.artSculpture, IMG.artWatercolor, IMG.artEngraving2, IMG.artWatercolor2],
};
// Fallback temático si aparece una pieza sin mapear.
const FOTOS_FALLBACK = [IMG.artOil, IMG.antiqueClock, IMG.jewelWatch, IMG.wineRed, IMG.artSculpture, IMG.antiqueMirror];
const fotosDePieza = (numeroPieza: string) => FOTOS_POR_PIEZA[numeroPieza] ?? FOTOS_FALLBACK;

/** Crea/actualiza una Persona core + su PersonaApp (clave natural: email). */
async function upsertPersona(
  email: string,
  core: { nombre: string; documento?: string; direccion?: string; estado?: string },
  app: { apellido?: string; passwordHash?: string; isAdmin?: boolean; registrationStatus?: string; paisOrigen?: string },
): Promise<number> {
  const existing = await prisma.personaApp.findUnique({ where: { email } });
  if (existing) {
    await prisma.personaApp.update({ where: { email }, data: app });
    await prisma.persona.update({ where: { identificador: existing.personaId }, data: { nombre: core.nombre, direccion: core.direccion, estado: core.estado ?? 'activo', documento: core.documento ?? '' } });
    return existing.personaId;
  }
  const persona = await prisma.persona.create({
    data: { nombre: core.nombre, documento: core.documento ?? '', direccion: core.direccion, estado: core.estado ?? 'activo', app: { create: { email, ...app } } },
  });
  return persona.identificador;
}

async function upsertEmpleado(email: string, nombre: string, apellido: string, cargo: string, sectorId: number): Promise<number> {
  const id = await upsertPersona(email, { nombre, documento: `DOC-${email.split('@')[0]}` }, { apellido, registrationStatus: 'aprobado' });
  await prisma.empleado.upsert({ where: { identificador: id }, create: { identificador: id, cargo, sectorId }, update: { cargo, sectorId } });
  return id;
}

/**
 * Resincroniza las secuencias autoincrementales. El seed inserta algunas filas con
 * `identificador` explícito (subastas y catálogos), lo que NO avanza la secuencia de
 * Postgres. Sin esto, crear una subasta/catálogo desde la app reusa ids existentes y
 * falla con "Unique constraint failed on the fields: (identificador)".
 */
async function resetSequences() {
  const tablas = ['personas', 'sectores', 'subastas', 'productos', 'fotos', 'catalogos', 'itemsCatalogo', 'asistentes', 'pujos', 'registroDeSubasta'];
  for (const t of tablas) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"', 'identificador'), GREATEST((SELECT COALESCE(MAX(identificador), 0) FROM "${t}"), 1))`,
    );
  }
}

/** Seguro por pieza (consigna: a cada bien recibido se le contrata un seguro según el valor base). */
async function crearSeguro(productoId: number, base: number) {
  const nroPoliza = `POL-${productoId}`;
  await prisma.seguro.upsert({
    where: { nroPoliza },
    create: { nroPoliza, compania: 'La Subastadora Seguros S.A.', importe: Math.max(1, Math.round(base)), polizaCombinada: 'no' },
    update: { importe: Math.max(1, Math.round(base)) },
  });
  await prisma.producto.update({ where: { identificador: productoId }, data: { nroPoliza } });
}

type ProductoSeed = {
  numeroPieza: string;
  descripcionCompleta: string;
  descripcionCatalogo?: string;
  precioBase: number;
  esObraDeArte?: boolean;
  artista?: string;
  fechaObra?: string;
  historia?: string;
  cantidadElementos?: number;
  deposito: string;
  ubicacion: string;
};

/** Crea una subasta completa: subasta + catálogo + productos (con fotos y seguro) + items. */
async function seedAuction(args: {
  id: number;
  titulo: string;
  descripcion: string;
  fechaHora: Date;
  ubicacion: string;
  categoria: string;
  estado: string;
  moneda?: string;
  tieneDeposito?: string;
  seguridadPropia?: string;
  capacidadAsistentes?: number;
  subastadorId: number;
  duenioId: number;
  revisorId: number;
  responsableId: number;
  productos: ProductoSeed[];
  liveItemIndex?: number;
}): Promise<number[]> {
  await prisma.subasta.upsert({
    where: { identificador: args.id },
    create: {
      identificador: args.id,
      fecha: args.fechaHora,
      hora: args.fechaHora,
      estado: args.estado,
      ubicacion: args.ubicacion,
      categoria: args.categoria,
      tieneDeposito: args.tieneDeposito ?? 'si',
      seguridadPropia: args.seguridadPropia ?? 'no',
      capacidadAsistentes: args.capacidadAsistentes ?? 100,
      subastadorId: args.subastadorId,
      app: { create: { titulo: args.titulo, descripcion: args.descripcion, fechaHora: args.fechaHora, moneda: args.moneda ?? 'ARS' } },
    },
    update: { estado: args.estado },
  });

  const catalogoId = args.id;
  await prisma.catalogo.upsert({
    where: { identificador: catalogoId },
    create: { identificador: catalogoId, descripcion: `Catálogo · ${args.titulo}`, subastaId: args.id, responsableId: args.responsableId },
    update: { responsableId: args.responsableId },
  });

  const itemIds: number[] = [];
  for (let i = 0; i < args.productos.length; i++) {
    const pd = args.productos[i];
    const existingApp = await prisma.productoApp.findUnique({ where: { numeroPieza: pd.numeroPieza } });
    let productoId = existingApp?.productoId;
    if (productoId == null) {
      const producto = await prisma.producto.create({
        data: {
          fecha: new Date(Date.now() - 5 * DAY),
          disponible: 'si',
          descripcionCompleta: pd.descripcionCompleta,
          descripcionCatalogo: pd.descripcionCatalogo ?? pd.descripcionCompleta,
          duenioId: args.duenioId,
          revisorId: args.revisorId,
          fotos: {
            create: fotosDePieza(pd.numeroPieza).map((url, k) => ({ app: { create: { url, orden: k } } })),
          },
          app: {
            create: {
              numeroPieza: pd.numeroPieza,
              status: 'disponible',
              moneda: args.moneda ?? 'ARS',
              esObraDeArte: pd.esObraDeArte ?? false,
              artista: pd.artista,
              fechaObra: pd.fechaObra,
              historia: pd.historia,
              cantidadElementos: pd.cantidadElementos ?? 1,
              deposito: pd.deposito,
              ubicacion: pd.ubicacion,
            },
          },
        },
      });
      productoId = producto.identificador;
      await crearSeguro(productoId, pd.precioBase);
    }

    let item = await prisma.itemCatalogo.findFirst({ where: { catalogoId, productoId } });
    if (!item) {
      item = await prisma.itemCatalogo.create({
        data: { catalogoId, productoId, precioBase: pd.precioBase, comision: Math.round(pd.precioBase * 0.05), app: { create: { ordenEnSubasta: i + 1, status: 'en_subasta' } } },
      });
    }
    itemIds.push(item.identificador);
  }

  if (args.liveItemIndex != null && itemIds[args.liveItemIndex] != null) {
    await prisma.subasta.update({
      where: { identificador: args.id },
      data: { app: { update: { currentItemId: itemIds[args.liveItemIndex], currentItemEndsAt: new Date(Date.now() + 60 * 60 * 1000) } } },
    });
  }
  console.log(`✅ Subasta #${args.id} "${args.titulo}" (${args.estado}) · ${args.productos.length} piezas`);
  return itemIds;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Países ───────────────────────────────────────────────────────────────────
  const paises = [
    { numero: 32, nombre: 'Argentina', nombreCorto: 'ARG', capital: 'Buenos Aires', nacionalidad: 'argentina', idiomas: 'Español' },
    { numero: 858, nombre: 'Uruguay', nombreCorto: 'URU', capital: 'Montevideo', nacionalidad: 'uruguaya', idiomas: 'Español' },
    { numero: 76, nombre: 'Brasil', nombreCorto: 'BRA', capital: 'Brasilia', nacionalidad: 'brasileña', idiomas: 'Portugués' },
    { numero: 840, nombre: 'Estados Unidos', nombreCorto: 'USA', capital: 'Washington D.C.', nacionalidad: 'estadounidense', idiomas: 'Inglés' },
    { numero: 724, nombre: 'España', nombreCorto: 'ESP', capital: 'Madrid', nacionalidad: 'española', idiomas: 'Español' },
  ];
  for (const p of paises) await prisma.pais.upsert({ where: { numero: p.numero }, create: p, update: p });

  // ── Sectores ──────────────────────────────────────────────────────────────────
  const sectorNames = ['Verificación', 'Revisión de productos', 'Catálogo', 'Depósito', 'Seguros', 'Administración', 'Logística'];
  const sector: Record<string, number> = {};
  for (const nombre of sectorNames) {
    const ex = await prisma.sector.findFirst({ where: { nombreSector: nombre } });
    const s = ex ?? (await prisma.sector.create({ data: { nombreSector: nombre, codigoSector: nombre.slice(0, 3).toUpperCase() } }));
    sector[nombre] = s.identificador;
  }

  // ── Empleados ─────────────────────────────────────────────────────────────────
  const systemId = await upsertPersona(SYSTEM_EMPLEADO_EMAIL, { nombre: 'Sistema' }, { apellido: 'Interno', registrationStatus: 'aprobado' });
  await prisma.empleado.upsert({ where: { identificador: systemId }, create: { identificador: systemId, cargo: 'Administración', sectorId: sector['Administración'] }, update: { cargo: 'Administración', sectorId: sector['Administración'] } });

  const verificadorId = await upsertEmpleado('ana.verif@subastas.com', 'Ana', 'Gómez', 'Verificadora de clientes', sector['Verificación']);
  const revisorId = await upsertEmpleado('pedro.rev@subastas.com', 'Pedro', 'Ruiz', 'Revisor de piezas', sector['Revisión de productos']);
  const responsableId = await upsertEmpleado('lucia.cat@subastas.com', 'Lucía', 'Díaz', 'Responsable de catálogo', sector['Catálogo']);
  const depositoId = await upsertEmpleado('jorge.dep@subastas.com', 'Jorge', 'Fernández', 'Encargado de depósito', sector['Depósito']);

  // Responsables de sector
  await prisma.sector.update({ where: { identificador: sector['Verificación'] }, data: { responsableSector: verificadorId } });
  await prisma.sector.update({ where: { identificador: sector['Revisión de productos'] }, data: { responsableSector: revisorId } });
  await prisma.sector.update({ where: { identificador: sector['Catálogo'] }, data: { responsableSector: responsableId } });
  await prisma.sector.update({ where: { identificador: sector['Depósito'] }, data: { responsableSector: depositoId } });
  console.log(`✅ ${sectorNames.length} sectores · 5 empleados`);

  // ── Admin ───────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  await upsertPersona('admin@subastas.com', { nombre: 'Admin', direccion: 'Av. Corrientes 1234, CABA', documento: '20111111119' }, { apellido: 'Sistema', passwordHash: adminHash, isAdmin: true, registrationStatus: 'aprobado', paisOrigen: 'Argentina' });

  // ── Clientes ──────────────────────────────────────────────────────────────────
  const userHash = await bcrypt.hash('user123', 12);
  async function seedCliente(email: string, nombre: string, apellido: string, doc: string, dir: string, pais: number, categoria: string, pass?: string) {
    const id = await upsertPersona(email, { nombre, direccion: dir, documento: doc }, { apellido, passwordHash: pass, isAdmin: false, registrationStatus: 'aprobado', paisOrigen: 'Argentina' });
    await prisma.cliente.upsert({
      where: { identificador: id },
      create: { identificador: id, categoria, admitido: 'si', verificadorId, numeroPais: pais },
      update: { categoria, admitido: 'si', verificadorId, numeroPais: pais },
    });
    return id;
  }
  const demoId = await seedCliente('usuario@demo.com', 'Juan', 'Pérez', '30222222227', 'Av. Santa Fe 5678, CABA', 32, 'oro', userHash);
  await seedCliente('sofia@demo.com', 'Sofía', 'Romero', '27333333334', 'Bvar. España 200, Montevideo', 858, 'platino');
  const martinId = await seedCliente('martin@demo.com', 'Martín', 'Silva', '23444444449', 'Rua Augusta 50, São Paulo', 76, 'especial');

  // Solicitud de cambio de datos de ejemplo (pendiente) para el panel admin.
  if ((await prisma.profileChangeRequest.count()) === 0) {
    await prisma.profileChangeRequest.create({
      data: {
        personaId: martinId,
        nombre: 'Martín',
        apellido: 'Silva Gómez',
        domicilioLegal: 'Rua Augusta 1200, São Paulo',
        cuentaCobro: 'Itaú · USD ····7788',
        estado: 'pendiente',
      },
    });
  }

  // Medios de pago del usuario demo (necesarios para pujar)
  const pmCount = await prisma.paymentMethod.count({ where: { personaId: demoId } });
  if (pmCount === 0) {
    await prisma.paymentMethod.createMany({
      data: [
        { personaId: demoId, tipo: 'cuenta_bancaria_nacional', moneda: 'ARS', banco: 'Banco Nación', numeroCuenta: '0110599520000001234567', verificado: true, estado: 'aprobada', activo: true },
        { personaId: demoId, tipo: 'cuenta_bancaria_extranjera', moneda: 'USD', banco: 'Citibank', numeroCuenta: 'US12345678901234', swift: 'CITIUS33', verificado: true, estado: 'aprobada', activo: true },
        { personaId: demoId, tipo: 'cuenta_bancaria_nacional', moneda: 'ARS', banco: 'Banco Macro', numeroCuenta: '2850590940090418135201', verificado: false, estado: 'pendiente', activo: true },
        { personaId: demoId, tipo: 'tarjeta_credito_nacional', moneda: 'ARS', banco: 'Banco Galicia', numeroTarjeta: '4242', titularTarjeta: 'Juan Pérez', vencimiento: '12/28', verificado: false, estado: 'pendiente', activo: true },
        { personaId: demoId, tipo: 'tarjeta_credito_internacional', moneda: 'AMBAS', banco: 'American Express', numeroTarjeta: '1005', titularTarjeta: 'Juan Pérez', vencimiento: '06/29', verificado: true, estado: 'aprobada', activo: true },
        { personaId: demoId, tipo: 'cheque_certificado', moneda: 'ARS', banco: 'Banco Provincia', montoGarantia: 200000, verificado: false, estado: 'rechazada', activo: true },
      ],
    });
  }

  // ── Cliente "empresa" (compra los ítems sin pujas al valor base) ───────────────
  const empresaId = await upsertPersona(EMPRESA_CLIENTE_EMAIL, { nombre: 'Casa de Subastas', direccion: 'Av. del Libertador 100, CABA', documento: '30707070704' }, { apellido: 'S.A.', registrationStatus: 'aprobado', paisOrigen: 'Argentina' });
  await prisma.cliente.upsert({
    where: { identificador: empresaId },
    create: { identificador: empresaId, categoria: 'platino', admitido: 'si', verificadorId, numeroPais: 32 },
    update: { categoria: 'platino', admitido: 'si', verificadorId, numeroPais: 32 },
  });

  // ── Subastadores (martilleros) ────────────────────────────────────────────────
  async function seedSubastador(email: string, nombre: string, apellido: string, documento: string, matricula: string, region: string) {
    const id = await upsertPersona(email, { nombre, documento }, { apellido, registrationStatus: 'aprobado' });
    await prisma.subastador.upsert({
      where: { identificador: id },
      create: { identificador: id, matricula, region, app: { create: { activo: true, email } } },
      update: { matricula, region, app: { upsert: { create: { activo: true, email }, update: { activo: true } } } },
    });
    return id;
  }
  const subId = await seedSubastador('rematador@subastas.com', 'Carlos', 'Rodríguez', '24555555556', 'MAT-001', 'CABA');
  const sub2Id = await seedSubastador('rematador2@subastas.com', 'Lucía', 'Fernández', '27666666667', 'MAT-002', 'GBA Norte');
  const sub3Id = await seedSubastador('rematador3@subastas.com', 'Diego', 'Martínez', '20777777778', 'MAT-003', 'Córdoba');

  // ── Dueño (con verificación financiera/judicial y calificación de riesgo) ──────
  const duenioId = await upsertPersona('duenio@demo.com', { nombre: 'María', direccion: 'Calle Falsa 123, CABA', documento: '26666666663' }, { apellido: 'López', registrationStatus: 'aprobado', paisOrigen: 'Argentina' });
  await prisma.duenio.upsert({
    where: { identificador: duenioId },
    create: { identificador: duenioId, verificadorId, numeroPais: 32, verificacionFinanciera: 'si', verificacionJudicial: 'si', calificacionRiesgo: 2 },
    update: { verificadorId, numeroPais: 32, verificacionFinanciera: 'si', verificacionJudicial: 'si', calificacionRiesgo: 2 },
  });
  console.log(`✅ Usuarios (admin, demo=${demoId}, sofia, martin, empresa=${empresaId}, subastadores=${subId}/${sub2Id}/${sub3Id}, dueño=${duenioId})`);

  const common = { subastadorId: subId, duenioId, revisorId, responsableId };

  // ── Subasta EN VIVO ────────────────────────────────────────────────────────────
  await seedAuction({
    ...common, id: 1, titulo: 'Arte Contemporáneo - En Vivo', descripcion: 'Remate en vivo de pintura y escultura contemporánea.',
    fechaHora: new Date(), ubicacion: 'Palais de Glace, Posadas 1725, CABA', categoria: 'especial', estado: 'abierta',
    tieneDeposito: 'si', seguridadPropia: 'si', capacidadAsistentes: 150,
    productos: [
      { numeroPieza: 'A1-001', descripcionCompleta: 'Óleo sobre tela - Paisaje Patagónico', precioBase: 50000, esObraDeArte: true, artista: 'R. Soldi', fechaObra: '1962', historia: 'Pieza exhibida en el Museo Nacional en 1965.', deposito: 'Depósito Central', ubicacion: 'Estante A-12' },
      { numeroPieza: 'A1-002', descripcionCompleta: 'Acuarela - Puerto al atardecer', precioBase: 65000, esObraDeArte: true, artista: 'F. Fader', fechaObra: '1918', deposito: 'Depósito Central', ubicacion: 'Estante A-13' },
      { numeroPieza: 'A1-003', descripcionCompleta: 'Escultura en bronce - Danza', precioBase: 80000, cantidadElementos: 1, deposito: 'Depósito Central', ubicacion: 'Sala segura S-2' },
    ],
    liveItemIndex: 0,
  });

  // ── Subastas PROGRAMADAS ───────────────────────────────────────────────────────
  await seedAuction({
    ...common, id: 2, titulo: 'Antigüedades y Mobiliario', descripcion: 'Piezas de colección de los siglos XIX y XX.',
    fechaHora: new Date(Date.now() + 12 * DAY), ubicacion: 'Hotel Alvear, Av. Alvear 1891, CABA', categoria: 'comun', estado: 'programada',
    tieneDeposito: 'si', seguridadPropia: 'no', capacidadAsistentes: 80,
    productos: [
      { numeroPieza: 'A2-001', descripcionCompleta: 'Reloj de pie inglés de roble', precioBase: 50000, historia: 'Fabricado en Londres, circa 1890.', deposito: 'Depósito Norte', ubicacion: 'Pasillo 3' },
      { numeroPieza: 'A2-002', descripcionCompleta: 'Juego de sillas estilo Luis XV (6 piezas)', precioBase: 65000, cantidadElementos: 6, deposito: 'Depósito Norte', ubicacion: 'Pasillo 3' },
      { numeroPieza: 'A2-003', descripcionCompleta: 'Espejo veneciano dorado', precioBase: 80000, deposito: 'Depósito Norte', ubicacion: 'Pasillo 4' },
    ],
  });

  await seedAuction({
    ...common, subastadorId: sub2Id, id: 3, titulo: 'Joyas y Relojería', descripcion: 'Alta joyería y relojes de autor.',
    fechaHora: new Date(Date.now() + 20 * DAY), ubicacion: 'Four Seasons, Posadas 1086, CABA', categoria: 'plata', estado: 'programada', moneda: 'USD',
    tieneDeposito: 'si', seguridadPropia: 'si', capacidadAsistentes: 40,
    productos: [
      { numeroPieza: 'A3-001', descripcionCompleta: 'Reloj suizo automático en oro', precioBase: 4000, deposito: 'Bóveda', ubicacion: 'Caja fuerte 1' },
      { numeroPieza: 'A3-002', descripcionCompleta: 'Collar de perlas naturales', precioBase: 6000, deposito: 'Bóveda', ubicacion: 'Caja fuerte 2' },
    ],
  });

  await seedAuction({
    ...common, subastadorId: sub3Id, id: 4, titulo: 'Vinos y Destilados de Colección', descripcion: 'Añadas únicas y botellas de edición limitada.',
    fechaHora: new Date(Date.now() + 30 * DAY), ubicacion: 'La Rural, Av. Sarmiento 2704, CABA', categoria: 'oro', estado: 'programada',
    tieneDeposito: 'si', seguridadPropia: 'no', capacidadAsistentes: 60,
    productos: [
      { numeroPieza: 'A4-001', descripcionCompleta: 'Malbec Gran Reserva 1995 (magnum)', precioBase: 50000, deposito: 'Cava', ubicacion: 'Rack 7' },
      { numeroPieza: 'A4-002', descripcionCompleta: 'Whisky single malt 30 años', precioBase: 70000, deposito: 'Cava', ubicacion: 'Rack 8' },
      { numeroPieza: 'A4-003', descripcionCompleta: 'Champagne vintage 2002', precioBase: 90000, deposito: 'Cava', ubicacion: 'Rack 9' },
    ],
  });

  // ── Subasta CERRADA con una venta concretada (compra del usuario demo) ─────────
  const cerradaItems = await seedAuction({
    ...common, id: 5, titulo: 'Subasta de Verano (cerrada)', descripcion: 'Subasta finalizada, con piezas adjudicadas.',
    fechaHora: new Date(Date.now() - 3 * DAY), ubicacion: 'Centro de Convenciones, CABA', categoria: 'especial', estado: 'cerrada',
    tieneDeposito: 'si', seguridadPropia: 'si', capacidadAsistentes: 120,
    productos: [
      { numeroPieza: 'A5-001', descripcionCompleta: 'Grabado firmado y numerado', precioBase: 40000, esObraDeArte: true, artista: 'A. Berni', fechaObra: '1970', deposito: 'Depósito Central', ubicacion: 'Estante B-04' },
    ],
  });
  const ventaItemId = cerradaItems[0];
  const ventaItem = await prisma.itemCatalogo.findUnique({ where: { identificador: ventaItemId }, include: { producto: true } });
  const yaVendido = await prisma.registroDeSubasta.findFirst({ where: { productoId: ventaItem!.productoId } });
  if (ventaItem && !yaVendido) {
    const demoPm = await prisma.paymentMethod.findFirst({ where: { personaId: demoId, moneda: 'ARS', verificado: true } });
    const count = await prisma.asistente.count({ where: { subastaId: 5 } });
    const asistente = await prisma.asistente.upsert({
      where: { subastaId_clienteId: { subastaId: 5, clienteId: demoId } },
      create: { subastaId: 5, clienteId: demoId, numeroPostor: count + 1, app: { create: { isActive: false, leftAt: new Date(Date.now() - 3 * DAY) } } },
      update: {},
    });
    const importe = Math.round(Number(ventaItem.precioBase) * 1.15);
    await prisma.pujo.create({
      data: { asistenteId: asistente.identificador, itemId: ventaItemId, importe, ganador: 'si', app: { create: { confirmada: true, moneda: 'ARS', paymentMethodId: demoPm?.id ?? null } } },
    });
    await prisma.itemCatalogo.update({ where: { identificador: ventaItemId }, data: { subastado: 'si', app: { update: { status: 'vendido' } } } });
    await prisma.producto.update({ where: { identificador: ventaItem.productoId }, data: { disponible: 'no', app: { update: { status: 'vendido' } } } });
    await prisma.registroDeSubasta.create({
      data: {
        subastaId: 5, duenioId, productoId: ventaItem.productoId, clienteId: demoId,
        importe, comision: Math.round(importe * 0.05),
        app: { create: { moneda: 'ARS', status: 'pendiente_pago', paymentMethodId: demoPm?.id ?? null, costoEnvio: Math.round(importe * 0.02) } },
      },
    });
    console.log('✅ Venta cerrada de ejemplo (compra del usuario demo, pendiente de pago)');
  }

  await resetSequences();

  console.log('\n🎉 Seed completado!');
  console.log('\nCredenciales:');
  console.log('  Admin:    admin@subastas.com / admin123');
  console.log('  Usuario:  usuario@demo.com / user123  (categoría oro)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
