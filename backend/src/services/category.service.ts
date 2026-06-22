import { prisma } from '../config/prisma';

const CATEGORY_RANK: Record<string, number> = {
  comun: 1, especial: 2, plata: 3, oro: 4, platino: 5,
};
const RANK_CATEGORY: Record<number, string> = {
  1: 'comun', 2: 'especial', 3: 'plata', 4: 'oro', 5: 'platino',
};

export const categoryService = {
  rank(cat: string): number {
    return CATEGORY_RANK[cat] ?? 1;
  },

  canAccessAuction(userCat: string, auctionCat: string): boolean {
    return (CATEGORY_RANK[userCat] ?? 1) >= (CATEGORY_RANK[auctionCat] ?? 1);
  },

  async evaluateUpgrade(personaId: number) {
    const [paymentMethods, registros, participaciones] = await Promise.all([
      prisma.paymentMethod.findMany({ where: { personaId, activo: true, verificado: true } }),
      prisma.registroDeSubasta.count({ where: { clienteId: personaId, app: { status: 'pagado' } } }),
      prisma.asistente.count({ where: { clienteId: personaId } }),
    ]);

    const uniqueTypes = new Set(paymentMethods.map((pm) => pm.tipo)).size;
    const cliente = await prisma.cliente.findUnique({
      where: { identificador: personaId },
      select: { categoria: true },
    });
    if (!cliente) return;

    let targetRank = CATEGORY_RANK[cliente.categoria ?? 'comun'] ?? 1;

    if (uniqueTypes >= 3 && registros >= 5 && participaciones >= 10) targetRank = Math.min(5, targetRank + 1);
    else if (uniqueTypes >= 2 && registros >= 2 && participaciones >= 5) targetRank = Math.min(4, targetRank + 1);

    const newCategory = RANK_CATEGORY[targetRank];
    if (newCategory !== cliente.categoria) {
      await prisma.cliente.update({
        where: { identificador: personaId },
        data: { categoria: newCategory },
      });
    }
  },
};
