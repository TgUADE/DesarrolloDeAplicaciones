-- CreateTable
CREATE TABLE "paises" (
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCorto" TEXT,
    "capital" TEXT NOT NULL,
    "nacionalidad" TEXT NOT NULL,
    "idiomas" TEXT NOT NULL,

    CONSTRAINT "paises_pkey" PRIMARY KEY ("numero")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "cargo" TEXT,
    "sectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectores" (
    "id" TEXT NOT NULL,
    "nombreSector" TEXT NOT NULL,
    "codigoSector" TEXT,
    "responsableId" TEXT,

    CONSTRAINT "sectores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogos" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "auctionId" TEXT,
    "responsableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_catalogo" (
    "id" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "precioBase" DECIMAL(18,2) NOT NULL,
    "comision" DECIMAL(18,2) NOT NULL,
    "subastado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "items_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_de_subasta" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "duenioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "comision" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_de_subasta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectores" ADD CONSTRAINT "sectores_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogos" ADD CONSTRAINT "catalogos_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogos" ADD CONSTRAINT "catalogos_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_catalogo" ADD CONSTRAINT "items_catalogo_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "catalogos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_catalogo" ADD CONSTRAINT "items_catalogo_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_de_subasta" ADD CONSTRAINT "registro_de_subasta_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_de_subasta" ADD CONSTRAINT "registro_de_subasta_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_de_subasta" ADD CONSTRAINT "registro_de_subasta_duenioId_fkey" FOREIGN KEY ("duenioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_de_subasta" ADD CONSTRAINT "registro_de_subasta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
