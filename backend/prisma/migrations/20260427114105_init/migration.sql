-- CreateEnum
CREATE TYPE "UserCategory" AS ENUM ('comun', 'especial', 'plata', 'oro', 'platino');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pendiente', 'aprobado', 'suspendido', 'bloqueado');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('programada', 'abierta', 'cerrada', 'finalizada');

-- CreateEnum
CREATE TYPE "AuctionCategory" AS ENUM ('comun', 'especial', 'plata', 'oro', 'platino');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('disponible', 'en_subasta', 'vendido');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('cuenta_bancaria_nacional', 'cuenta_bancaria_extranjera', 'tarjeta_credito_nacional', 'tarjeta_credito_internacional', 'cheque_certificado');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pendiente_empresa', 'interesada', 'rechazada_empresa', 'precio_propuesto', 'aceptada_usuario', 'rechazada_usuario');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('pendiente_pago', 'pagado', 'multa_aplicada', 'derivado_justicia');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "docFrenteUrl" TEXT NOT NULL,
    "docDorsoUrl" TEXT NOT NULL,
    "domicilioLegal" TEXT NOT NULL,
    "paisOrigen" TEXT NOT NULL,
    "categoria" "UserCategory" NOT NULL DEFAULT 'comun',
    "status" "UserStatus" NOT NULL DEFAULT 'pendiente',
    "registrationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "cuentaCobro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "PaymentType" NOT NULL,
    "moneda" "Currency" NOT NULL,
    "banco" TEXT,
    "numeroCuenta" TEXT,
    "swift" TEXT,
    "numeroTarjeta" TEXT,
    "titularTarjeta" TEXT,
    "vencimiento" TEXT,
    "montoGarantia" DECIMAL(12,2),
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rematadores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rematadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "categoria" "AuctionCategory" NOT NULL,
    "moneda" "Currency" NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'programada',
    "esColeccion" BOOLEAN NOT NULL DEFAULT false,
    "nombreColeccion" TEXT,
    "rematadorId" TEXT NOT NULL,
    "currentItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "numeroPieza" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioBase" DECIMAL(12,2) NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'disponible',
    "currentOwnerId" TEXT NOT NULL,
    "auctionId" TEXT,
    "ordenEnSubasta" INTEGER,
    "esObraDeArte" BOOLEAN NOT NULL DEFAULT false,
    "artista" TEXT,
    "fechaObra" TEXT,
    "historia" TEXT,
    "cantidadElementos" INTEGER NOT NULL DEFAULT 1,
    "descripcionElementos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submissionId" TEXT,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_images" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pujas" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" "Currency" NOT NULL,
    "confirmada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pujas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_participants" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "auction_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "datosHistoricos" TEXT,
    "declaracionPropiedad" BOOLEAN NOT NULL DEFAULT false,
    "origenLicito" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pendiente_empresa',
    "precioBaseOfrecido" DECIMAL(12,2),
    "comisionesInfo" TEXT,
    "motivoRechazo" TEXT,
    "gastoDevolucion" DECIMAL(12,2),
    "cuentaCobro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_images" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "submission_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguros" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "polizaNumero" TEXT NOT NULL,
    "polizaGrupoId" TEXT,
    "valorAsegurado" DECIMAL(12,2) NOT NULL,
    "beneficiarioId" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "contacto" TEXT,
    "vencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seguros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_ubicaciones" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "deposito" TEXT NOT NULL,
    "sector" TEXT,
    "notas" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "montoGanador" DECIMAL(12,2) NOT NULL,
    "moneda" "Currency" NOT NULL,
    "comisiones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costoEnvio" DECIMAL(12,2),
    "retiraPersonalmente" BOOLEAN NOT NULL DEFAULT false,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'pendiente_pago',
    "multa" DECIMAL(12,2),
    "multaAplicadaAt" TIMESTAMP(3),
    "pagoVencimientoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rematadores_matricula_key" ON "rematadores"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "items_numeroPieza_key" ON "items"("numeroPieza");

-- CreateIndex
CREATE UNIQUE INDEX "items_submissionId_key" ON "items"("submissionId");

-- CreateIndex
CREATE INDEX "pujas_itemId_createdAt_idx" ON "pujas"("itemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "auction_participants_auctionId_userId_key" ON "auction_participants"("auctionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "seguros_itemId_key" ON "seguros"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "item_ubicaciones_itemId_key" ON "item_ubicaciones"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_itemId_key" ON "purchases"("itemId");

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_rematadorId_fkey" FOREIGN KEY ("rematadorId") REFERENCES "rematadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "item_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_images" ADD CONSTRAINT "item_images_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pujas" ADD CONSTRAINT "pujas_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pujas" ADD CONSTRAINT "pujas_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pujas" ADD CONSTRAINT "pujas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_submissions" ADD CONSTRAINT "item_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_images" ADD CONSTRAINT "submission_images_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "item_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguros" ADD CONSTRAINT "seguros_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ubicaciones" ADD CONSTRAINT "item_ubicaciones_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
