import { prisma } from '../config/prisma';

const CARD_TYPES = ['tarjeta_credito_nacional', 'tarjeta_credito_internacional'];
const PAYMENT_TYPES = [
  'cuenta_bancaria_nacional',
  'cuenta_bancaria_extranjera',
  'tarjeta_credito_nacional',
  'tarjeta_credito_internacional',
  'cheque_certificado',
];
// 'AMBAS' solo aplica a tarjetas (cubren ARS y USD a la vez).
const CURRENCIES = ['ARS', 'USD', 'AMBAS'];

export const paymentMethodService = {
  async list(personaId: number) {
    return prisma.paymentMethod.findMany({
      where: { personaId, activo: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Listado para el panel admin: todos los medios activos (filtrable por estado de
   *  verificación), con los datos del usuario dueño. Pendientes primero. */
  async listForAdmin(estado?: string) {
    const where: any = { activo: true };
    if (estado) where.estado = estado;
    const pms = await prisma.paymentMethod.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
      include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true, email: true } } } } },
    });
    return pms.map((pm) => {
      const { persona, ...rest } = pm;
      return {
        ...rest,
        persona: persona
          ? { id: persona.identificador.toString(), nombre: persona.nombre, apellido: persona.app?.apellido ?? '', email: persona.app?.email ?? null }
          : null,
      };
    });
  },

  async create(
    personaId: number,
    data: {
      tipo: string;
      moneda: string;
      banco?: string;
      numeroCuenta?: string;
      swift?: string;
      numeroTarjeta?: string;
      titularTarjeta?: string;
      vencimiento?: string;
      montoGarantia?: number;
      montoDisponible?: number;
    },
  ) {
    if (!PAYMENT_TYPES.includes(data.tipo)) throw { status: 400, message: 'Tipo de medio de pago inválido' };
    if (!CURRENCIES.includes(data.moneda)) throw { status: 400, message: 'Moneda inválida' };
    const isCard = CARD_TYPES.includes(data.tipo);
    if (data.moneda === 'AMBAS' && !isCard) throw { status: 400, message: 'Solo las tarjetas pueden cubrir ambas monedas' };
    if (data.tipo === 'cuenta_bancaria_nacional' && data.moneda !== 'ARS') throw { status: 400, message: 'Una cuenta bancaria nacional debe ser en ARS' };
    if (data.tipo === 'cuenta_bancaria_extranjera' && data.moneda !== 'USD') throw { status: 400, message: 'Una cuenta bancaria extranjera debe ser en USD' };
    if (!data.banco?.trim()) throw { status: 400, message: 'Banco es obligatorio' };
    if (data.tipo.startsWith('cuenta_bancaria') && !data.numeroCuenta?.trim()) {
      throw { status: 400, message: 'CBU/IBAN o número de cuenta es obligatorio' };
    }
    if (data.tipo.startsWith('tarjeta_credito')) {
      if (!data.numeroTarjeta?.trim() || !data.titularTarjeta?.trim() || !data.vencimiento?.trim()) {
        throw { status: 400, message: 'Número, titular y vencimiento de tarjeta son obligatorios' };
      }
      if (data.numeroTarjeta.trim().length !== 4) {
        throw { status: 400, message: 'Se deben informar los últimos 4 dígitos de la tarjeta' };
      }
    }
    const montoDisponible = Number(data.montoDisponible ?? data.montoGarantia ?? 0);
    if (!Number.isFinite(montoDisponible) || montoDisponible <= 0) {
      throw { status: 400, message: 'El monto disponible del medio de pago es obligatorio y debe ser mayor a cero' };
    }
    const montoGarantia = data.tipo === 'cheque_certificado' ? Number(data.montoGarantia ?? montoDisponible) : data.montoGarantia;
    if (data.tipo === 'cheque_certificado' && (!montoGarantia || Number(montoGarantia) <= 0)) {
      throw { status: 400, message: 'El monto de garantía del cheque es obligatorio y debe ser mayor a cero' };
    }
    return prisma.paymentMethod.create({ data: { ...data, montoDisponible, montoGarantia, personaId } });
  },

  async update(
    id: string,
    personaId: number,
    data: Partial<{
      banco: string;
      numeroCuenta: string;
      swift: string;
      numeroTarjeta: string;
      titularTarjeta: string;
      vencimiento: string;
      montoGarantia: number;
      montoDisponible: number;
    }>,
  ) {
    const pm = await prisma.paymentMethod.findFirst({ where: { id, personaId } });
    if (!pm) throw { status: 404, message: 'Medio de pago no encontrado' };
    if (data.montoDisponible != null && (!Number.isFinite(Number(data.montoDisponible)) || Number(data.montoDisponible) <= 0)) {
      throw { status: 400, message: 'El monto disponible debe ser mayor a cero' };
    }
    return prisma.paymentMethod.update({ where: { id }, data });
  },

  async remove(id: string, personaId: number) {
    const pm = await prisma.paymentMethod.findFirst({ where: { id, personaId } });
    if (!pm) throw { status: 404, message: 'Medio de pago no encontrado' };
    return prisma.paymentMethod.update({ where: { id }, data: { activo: false } });
  },

  async verify(id: string, verificado: boolean) {
    const pm = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!pm) throw { status: 404, message: 'Medio de pago no encontrado' };
    return prisma.paymentMethod.update({ where: { id }, data: { verificado, verifiedAt: verificado ? new Date() : null } });
  },

  /** Un medio de pago cubre una moneda si coincide, o si es de tipo 'AMBAS' (tarjetas). */
  covers(monedaPm: string, target: string): boolean {
    return monedaPm === target || monedaPm === 'AMBAS';
  },
};
