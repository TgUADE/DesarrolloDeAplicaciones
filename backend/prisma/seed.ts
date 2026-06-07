import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
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

  // Demo user
  const userHash = await bcrypt.hash('user123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'usuario@demo.com' },
    update: {},
    create: {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'usuario@demo.com',
      passwordHash: userHash,
      docFrenteUrl: '/uploads/documents/placeholder.jpg',
      docDorsoUrl: '/uploads/documents/placeholder.jpg',
      domicilioLegal: 'Av. Santa Fe 5678, CABA',
      paisOrigen: 'Argentina',
      categoria: 'especial',
      status: 'aprobado',
    },
  });
  console.log(`✅ Demo user: ${demoUser.email}`);

  // Payment method for demo user
  await prisma.paymentMethod.upsert({
    where: { id: 'demo-pm-1' },
    update: {},
    create: {
      id: 'demo-pm-1',
      userId: demoUser.id,
      tipo: 'tarjeta_credito_nacional',
      moneda: 'ARS',
      numeroTarjeta: '4321',
      titularTarjeta: 'Juan Pérez',
      vencimiento: '12/27',
      verificado: true,
    },
  });

  // Auctioneer
  const rematador = await prisma.rematador.upsert({
    where: { matricula: 'MAT-001' },
    update: {},
    create: {
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      matricula: 'MAT-001',
      email: 'rematador@subastas.com',
    },
  });
  console.log(`✅ Rematador: ${rematador.nombre} ${rematador.apellido}`);

  // Demo auction
  const auction = await prisma.auction.upsert({
    where: { id: 'demo-auction-1' },
    update: {},
    create: {
      id: 'demo-auction-1',
      titulo: 'Subasta de Arte Moderno - Mayo 2026',
      descripcion: 'Colección exclusiva de arte moderno argentino',
      fechaHora: new Date('2026-05-15T18:00:00'),
      ubicacion: 'Palais de Glace, Posadas 1725, CABA',
      categoria: 'especial',
      moneda: 'ARS',
      status: 'programada',
      rematadorId: rematador.id,
    },
  });
  console.log(`✅ Subasta demo: ${auction.titulo}`);

  // Demo item
  const item = await prisma.item.upsert({
    where: { numeroPieza: 'PIEZA-001' },
    update: {},
    create: {
      numeroPieza: 'PIEZA-001',
      descripcion: 'Óleo sobre tela - Paisaje Patagónico',
      precioBase: 50000,
      currentOwnerId: admin.id,
      auctionId: auction.id,
      ordenEnSubasta: 1,
      status: 'en_subasta',
      esObraDeArte: true,
      artista: 'Roberto Páez',
      fechaObra: '1985',
      historia: 'Obra icónica del período post-modernista argentino.',
      cantidadElementos: 1,
    },
  });

  await prisma.itemImage.createMany({
    skipDuplicates: true,
    data: Array.from({ length: 6 }, (_, i) => ({
      itemId: item.id,
      url: `/uploads/items/placeholder-${i + 1}.jpg`,
      orden: i,
    })),
  });

  console.log(`✅ Ítem demo: ${item.descripcion}`);
  console.log('\n🎉 Seed completado!');
  console.log('\nCredenciales:');
  console.log('  Admin:    admin@subastas.com / admin123');
  console.log('  Usuario:  usuario@demo.com / user123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
