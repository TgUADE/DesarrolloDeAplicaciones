import { Brand } from '@/constants/theme';

/** Categorías de usuario/subasta → etiqueta y color de marca. */
export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  comun: { label: 'Común', color: Brand.catComun },
  especial: { label: 'Especial', color: Brand.catEspecial },
  plata: { label: 'Plata', color: Brand.catPlata },
  oro: { label: 'Oro', color: Brand.catOro },
  platino: { label: 'Platino', color: Brand.catPlatino },
};

export function categoryMeta(cat?: string) {
  return CATEGORY_META[cat ?? ''] ?? { label: cat ?? '—', color: Brand.textMuted };
}

/** Estado de subasta → etiqueta y color. */
export function auctionStatusMeta(status?: string) {
  switch (status) {
    case 'abierta':
      return { label: 'En vivo', color: Brand.danger };
    case 'programada':
      return { label: 'Próxima', color: Brand.warning };
    case 'cerrada':
    case 'finalizada':
      return { label: 'Finalizada', color: Brand.textMuted };
    default:
      return { label: status ?? '—', color: Brand.textMuted };
  }
}
