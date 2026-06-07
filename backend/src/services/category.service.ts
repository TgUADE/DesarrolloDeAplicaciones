import { UserCategory } from '@prisma/client';
import { prisma } from '../config/prisma';

const CATEGORY_RANK: Record<UserCategory, number> = {
  comun: 1, especial: 2, plata: 3, oro: 4, platino: 5,
};
const RANK_CATEGORY: Record<number, UserCategory> = {
  1: 'comun', 2: 'especial', 3: 'plata', 4: 'oro', 5: 'platino',
};

export const categoryService = {
  rank(cat: UserCategory): number {
    return CATEGORY_RANK[cat];
  },

  canAccessAuction(userCat: UserCategory, auctionCat: UserCategory): boolean {
    return CATEGORY_RANK[userCat] >= CATEGORY_RANK[auctionCat];
  },

  async evaluateUpgrade(userId: string) {
    const [paymentMethods, purchases, participaciones] = await Promise.all([
      prisma.paymentMethod.findMany({ where: { userId, activo: true, verificado: true } }),
      prisma.purchase.count({ where: { buyerId: userId, status: 'pagado' } }),
      prisma.auctionParticipant.count({ where: { userId } }),
    ]);

    const uniqueTypes = new Set(paymentMethods.map(pm => pm.tipo)).size;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { categoria: true } });
    if (!user) return;

    let targetRank = CATEGORY_RANK[user.categoria];

    // Simple upgrade rules based on activity
    if (uniqueTypes >= 3 && purchases >= 5 && participaciones >= 10) targetRank = Math.min(5, targetRank + 1);
    else if (uniqueTypes >= 2 && purchases >= 2 && participaciones >= 5) targetRank = Math.min(4, targetRank + 1);

    const newCategory = RANK_CATEGORY[targetRank];
    if (newCategory !== user.categoria) {
      await prisma.user.update({ where: { id: userId }, data: { categoria: newCategory } });
    }
  },
};
