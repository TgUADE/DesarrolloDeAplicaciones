import { PrismaClient, AuctionCategory, AuctionStatus, Currency } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** 6 imágenes reales y estables por ítem (picsum, sin API key). */
function mkImages(seed: string) {
  return Array.from({ length: 6 }, (_, j) => ({
    url: `https://picsum.photos/seed/${seed}-${j + 1}/800/600`,
    orden: j,
  }));
}

type ItemSeed = {
  numeroPieza: string;
  descripcion: string;
  precioBase: number;
  status?: 'en_subasta' | 'vendido' | 'disponible';
  esObraDeArte?: boolean;
  artista?: string;
  fechaObra?: string;
  historia?: string;
  cantidadElementos?: number;
};

type AuctionSeed = {
  id: string;
  titulo: string;
  descripcion?: string;
  fechaHora: Date;
  categoria: AuctionCategory;
  moneda: Currency;
  status: AuctionStatus;
  esColeccion?: boolean;
  nombreColeccion?: string;
  items: ItemSeed[];
};

async function main() {
  console.log('🌱 Seeding database...');

  // ---------- Usuarios ----------
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@subastas.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@subastas.com',
      passwordHash: adminHash,
      docFrenteUrl: '/uploads/documents/placeholder.jpg',
      docDorsoUrl: '/uploads/documents/placeholder.jpg',
      domicilioLegal: 'Av. Corrientes 1234, CABA',
      paisOrigen: 'Argentina',
      categoria: 'platino',
      status: 'aprobado',
      isAdmin: true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  const userHash = await bcrypt.hash('user123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'usuario@demo.com' },
    update: { categoria: 'oro' },
    create: {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'usuario@demo.com',
      passwordHash: userHash,
      docFrenteUrl: '/uploads/documents/placeholder.jpg',
      docDorsoUrl: '/uploads/documents/placeholder.jpg',
      domicilioLegal: 'Av. Santa Fe 5678, CABA',
      paisOrigen: 'Argentina',
      categoria: 'oro',
      status: 'aprobado',
    },
  });
  console.log(`✅ Demo user: ${demoUser.email}`);

  // Medios de pago del usuario demo (uno nacional ARS y uno internacional USD)
  await prisma.paymentMethod.upsert({
    where: { id: 'demo-pm-1' },
    update: { verificado: true, activo: true },
    create: {
      id: 'demo-pm-1',
      userId: demoUser.id,
      tipo: 'tarjeta_credito_nacional',
      moneda: 'ARS',
      banco: 'Banco Galicia',
      numeroTarjeta: '4321',
      titularTarjeta: 'Juan Pérez',
      vencimiento: '12/27',
      verificado: true,
    },
  });
  await prisma.paymentMethod.upsert({
    where: { id: 'demo-pm-2' },
    update: { verificado: true, activo: true },
    create: {
      id: 'demo-pm-2',
      userId: demoUser.id,
      tipo: 'tarjeta_credito_internacional',
      moneda: 'USD',
      banco: 'Citibank',
      numeroTarjeta: '8790',
      titularTarjeta: 'Juan Pérez',
      vencimiento: '08/28',
      verificado: true,
    },
  });
  console.log('✅ Medios de pago del usuario demo (ARS + USD)');

  // ---------- Rematadores ----------
  const rematador = await prisma.rematador.upsert({
    where: { matricula: 'MAT-001' },
    update: {},
    create: { nombre: 'Carlos', apellido: 'Rodríguez', matricula: 'MAT-001', email: 'rematador@subastas.com' },
  });
  const rematador2 = await prisma.rematador.upsert({
    where: { matricula: 'MAT-002' },
    update: {},
    create: { nombre: 'Lucía', apellido: 'Méndez', matricula: 'MAT-002', email: 'lucia@subastas.com' },
  });
  console.log('✅ Rematadores');

  // ---------- Helper para crear subasta + ítems + imágenes ----------
  async function seedAuction(a: AuctionSeed, rematadorId: string) {
    const auction = await prisma.auction.upsert({
      where: { id: a.id },
      update: { status: a.status, fechaHora: a.fechaHora },
      create: {
        id: a.id,
        titulo: a.titulo,
        descripcion: a.descripcion ?? null,
        fechaHora: a.fechaHora,
        ubicacion: 'Palais de Glace, Posadas 1725, CABA',
        categoria: a.categoria,
        moneda: a.moneda,
        status: a.status,
        esColeccion: a.esColeccion ?? false,
        nombreColeccion: a.nombreColeccion ?? null,
        rematadorId,
      },
    });

    const created = [];
    for (let i = 0; i < a.items.length; i++) {
      const d = a.items[i];
      const it = await prisma.item.upsert({
        where: { numeroPieza: d.numeroPieza },
        update: { auctionId: auction.id, status: d.status ?? 'en_subasta', ordenEnSubasta: i + 1 },
        create: {
          numeroPieza: d.numeroPieza,
          descripcion: d.descripcion,
          precioBase: d.precioBase,
          currentOwnerId: admin.id,
          auctionId: auction.id,
          ordenEnSubasta: i + 1,
          status: d.status ?? 'en_subasta',
          esObraDeArte: d.esObraDeArte ?? false,
          artista: d.artista ?? null,
          fechaObra: d.fechaObra ?? null,
          historia: d.historia ?? null,
          cantidadElementos: d.cantidadElementos ?? 1,
        },
      });
      // Imágenes idempotentes: borrar y recrear
      await prisma.itemImage.deleteMany({ where: { itemId: it.id } });
      await prisma.itemImage.createMany({
        data: mkImages(d.numeroPieza).map((x) => ({ ...x, itemId: it.id })),
      });
      created.push(it);
    }

    // Si está abierta, fijar el primer ítem como el que se está rematando
    if (a.status === 'abierta' && created.length > 0) {
      await prisma.auction.update({ where: { id: auction.id }, data: { currentItemId: created[0].id } });
    }

    return { auction, items: created };
  }

  // ---------- Catálogo de subastas ----------
  const now = new Date();
  const at = (deltaDays: number, hour = 18) => {
    const d = new Date(now);
    d.setDate(d.getDate() + deltaDays);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const auctions: { data: AuctionSeed; rematadorId: string }[] = [
    // EN VIVO
    {
      rematadorId: rematador.id,
      data: {
        id: 'auc-live-1',
        titulo: 'Colección Primavera 2026',
        descripcion: 'Mobiliario y objetos de diseño de los siglos XIX y XX.',
        fechaHora: now,
        categoria: 'especial',
        moneda: 'USD',
        status: 'abierta',
        esColeccion: true,
        nombreColeccion: 'Primavera 2026',
        items: [
          { numeroPieza: 'LIV-001', descripcion: 'Set sillas Luis XV (4)', precioBase: 38000 },
          { numeroPieza: 'LIV-002', descripcion: 'Sofá Luis XV tapizado en seda', precioBase: 15200 },
          { numeroPieza: 'LIV-003', descripcion: 'Juego de té porcelana (18 pzas)', precioBase: 5200, esObraDeArte: true, artista: 'Sèvres', fechaObra: 'siglo XIX', historia: 'Porcelana francesa de Sèvres, decorada a mano. Procedencia: colección privada.' },
          { numeroPieza: 'LIV-004', descripcion: 'Espejo veneciano dorado', precioBase: 12400 },
          { numeroPieza: 'LIV-005', descripcion: 'Mesa de luz estilo imperio', precioBase: 5800 },
          { numeroPieza: 'LIV-006', descripcion: 'Lámpara de pie art déco', precioBase: 7300 },
        ],
      },
    },
    {
      rematadorId: rematador2.id,
      data: {
        id: 'auc-live-2',
        titulo: 'Relojes y Joyas en Vivo',
        descripcion: 'Relojería fina y joyas de época.',
        fechaHora: now,
        categoria: 'comun',
        moneda: 'ARS',
        status: 'abierta',
        items: [
          { numeroPieza: 'RJ-001', descripcion: 'Reloj de bolsillo de plata', precioBase: 180000 },
          { numeroPieza: 'RJ-002', descripcion: 'Anillo de oro con esmeralda', precioBase: 420000 },
          { numeroPieza: 'RJ-003', descripcion: 'Collar de perlas naturales', precioBase: 310000 },
        ],
      },
    },
    // PRÓXIMAS
    {
      rematadorId: rematador.id,
      data: {
        id: 'demo-auction-1',
        titulo: 'Subasta de Arte Moderno - Mayo 2026',
        descripcion: 'Colección exclusiva de arte moderno argentino.',
        fechaHora: new Date('2026-05-15T18:00:00'),
        categoria: 'especial',
        moneda: 'ARS',
        status: 'programada',
        items: [
          { numeroPieza: 'PIEZA-001', descripcion: 'Óleo sobre tela - Paisaje Patagónico', precioBase: 50000, esObraDeArte: true, artista: 'Roberto Páez', fechaObra: '1985', historia: 'Obra icónica del período post-modernista argentino.' },
          { numeroPieza: 'PIEZA-002', descripcion: 'Acuarela - Puerto al atardecer', precioBase: 32000, esObraDeArte: true, artista: 'A. Berni', fechaObra: '1960' },
          { numeroPieza: 'PIEZA-003', descripcion: 'Escultura en bronce - Danza', precioBase: 78000, esObraDeArte: true, artista: 'R. Torres', fechaObra: '1972' },
        ],
      },
    },
    {
      rematadorId: rematador2.id,
      data: {
        id: 'auc-up-hoy',
        titulo: 'Especial de Hoy - Diseño Nórdico',
        fechaHora: at(0, Math.min(23, now.getHours() + 3)),
        categoria: 'oro',
        moneda: 'USD',
        status: 'programada',
        items: [
          { numeroPieza: 'ND-001', descripcion: 'Butaca de cuero estilo nórdico', precioBase: 4200 },
          { numeroPieza: 'ND-002', descripcion: 'Mesa de centro en roble', precioBase: 2800 },
        ],
      },
    },
    {
      rematadorId: rematador.id,
      data: {
        id: 'auc-up-1',
        titulo: 'Joyería Antigua',
        fechaHora: at(4),
        categoria: 'comun',
        moneda: 'ARS',
        status: 'programada',
        items: [
          { numeroPieza: 'JA-001', descripcion: 'Broche art nouveau', precioBase: 95000 },
          { numeroPieza: 'JA-002', descripcion: 'Pulsera de oro 18k', precioBase: 540000 },
        ],
      },
    },
    {
      rematadorId: rematador.id,
      data: {
        id: 'auc-up-2',
        titulo: 'Mobiliario de Diseño',
        fechaHora: at(7),
        categoria: 'especial',
        moneda: 'ARS',
        status: 'programada',
        items: [
          { numeroPieza: 'MD-001', descripcion: 'Sillón Eames original', precioBase: 680000 },
          { numeroPieza: 'MD-002', descripcion: 'Biblioteca modular de nogal', precioBase: 320000 },
          { numeroPieza: 'MD-003', descripcion: 'Aparador escandinavo', precioBase: 410000 },
        ],
      },
    },
    {
      rematadorId: rematador2.id,
      data: {
        id: 'auc-up-3',
        titulo: 'Relojería de Colección',
        fechaHora: at(10),
        categoria: 'plata',
        moneda: 'USD',
        status: 'programada',
        items: [
          { numeroPieza: 'RC-001', descripcion: 'Reloj suizo automático años 60', precioBase: 8900 },
          { numeroPieza: 'RC-002', descripcion: 'Cronógrafo de pulsera vintage', precioBase: 12500 },
        ],
      },
    },
    {
      rematadorId: rematador.id,
      data: {
        id: 'auc-up-4',
        titulo: 'Arte Contemporáneo',
        fechaHora: at(12),
        categoria: 'platino',
        moneda: 'USD',
        status: 'programada',
        items: [
          { numeroPieza: 'AC-001', descripcion: 'Instalación mixta s/ título', precioBase: 45000, esObraDeArte: true, artista: 'M. Schvartz', fechaObra: '2018' },
          { numeroPieza: 'AC-002', descripcion: 'Serigrafía edición limitada', precioBase: 9800, esObraDeArte: true, artista: 'Le Parc', fechaObra: '2005' },
        ],
      },
    },
    // FINALIZADA
    {
      rematadorId: rematador.id,
      data: {
        id: 'auc-fin-1',
        titulo: 'Antigüedades - Diciembre 2025',
        fechaHora: at(-60),
        categoria: 'especial',
        moneda: 'ARS',
        status: 'finalizada',
        items: [
          { numeroPieza: 'AN-001', descripcion: 'Cómoda francesa siglo XVIII', precioBase: 290000, status: 'vendido' },
          { numeroPieza: 'AN-002', descripcion: 'Vajilla de porcelana inglesa', precioBase: 150000, status: 'vendido' },
        ],
      },
    },
  ];

  const seeded: Record<string, { auction: any; items: any[] }> = {};
  for (const a of auctions) {
    seeded[a.data.id] = await seedAuction(a.data, a.rematadorId);
  }
  console.log(`✅ ${auctions.length} subastas con catálogo e imágenes`);

  // ---------- Pujas en vivo ----------
  async function seedBids(auctionId: string, montos: { userId: string; monto: number }[], moneda: Currency) {
    const { auction, items } = seeded[auctionId];
    const itemId = auction.currentItemId ?? items[0]?.id;
    if (!itemId) return;
    const count = await prisma.puja.count({ where: { itemId } });
    if (count > 0) return;
    for (const m of montos) {
      await prisma.puja.create({
        data: { auctionId, itemId, userId: m.userId, monto: m.monto, moneda, confirmada: true },
      });
    }
  }
  await seedBids('auc-live-1', [
    { userId: demoUser.id, monto: 38500 },
    { userId: admin.id, monto: 39200 },
    { userId: demoUser.id, monto: 40100 },
  ], 'USD');
  await seedBids('auc-live-2', [
    { userId: admin.id, monto: 185000 },
    { userId: demoUser.id, monto: 192000 },
  ], 'ARS');
  console.log('✅ Pujas en vivo');

  // ---------- Participaciones del usuario demo (Mis subastas) ----------
  for (const aid of ['auc-live-1', 'auc-live-2', 'demo-auction-1', 'auc-up-2', 'auc-fin-1']) {
    await prisma.auctionParticipant.upsert({
      where: { auctionId_userId: { auctionId: aid, userId: demoUser.id } },
      update: {},
      create: { auctionId: aid, userId: demoUser.id, isActive: aid.startsWith('auc-live') },
    });
  }
  console.log('✅ Participaciones del usuario demo');

  console.log('\n🎉 Seed completado!');
  console.log('\nCredenciales:');
  console.log('  Admin:    admin@subastas.com / admin123');
  console.log('  Usuario:  usuario@demo.com / user123  (categoría oro, puede pujar ARS y USD)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
