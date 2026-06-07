import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const idParam = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string' } });
const pageParam = { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Número de página' };
const categoryEnum = ['comun', 'especial', 'plata', 'oro', 'platino'];
const statusEnum   = ['pendiente', 'aprobado', 'suspendido', 'bloqueado'];
const auctionStatusEnum = ['programada', 'abierta', 'cerrada', 'finalizada'];
const paymentTypeEnum = ['cuenta_bancaria_nacional', 'cuenta_bancaria_extranjera', 'tarjeta_credito_nacional', 'tarjeta_credito_internacional', 'cheque_certificado'];
const currencyEnum = ['ARS', 'USD'];
const submissionStatusEnum = ['pendiente_empresa', 'interesada', 'rechazada_empresa', 'precio_propuesto', 'aceptada_usuario', 'rechazada_usuario'];
const purchaseStatusEnum = ['pendiente_pago', 'pagado', 'multa_aplicada', 'derivado_justicia'];

const jsonBody = (schema: object) => ({
  required: true,
  content: { 'application/json': { schema } },
});

const r = (description: string) => ({ description });

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Subastas — API REST',
      version: '1.0.0',
      description: `API REST completa del Sistema de Subastas Online — DAI 1C 2026.

**Autenticación:** Bearer JWT (access token 15 min). Incluir en cada request protegido:
\`Authorization: Bearer <accessToken>\`

**Formato de respuesta estándar:**
\`\`\`json
{ "success": true/false, "data": {...}, "error": "mensaje" }
\`\`\`

**Reglas clave de negocio:**
- Registro en 2 etapas: datos+docs → empresa aprueba → email con token → usuario completa registro
- Categorías (orden ascendente): comun < especial < plata < oro < platino
- Para pujar: usuario aprobado + categoría ≥ categoría subasta + al menos 1 medio de pago verificado
- Rango de puja (NO aplica a oro/platino): mín = última oferta + 1% precio base; máx = última oferta + 20% precio base
- Solo 1 subasta activa por usuario a la vez
- Subastas en USD: requieren tarjeta internacional o cuenta bancaria extranjera con moneda USD
- Si nadie puja un ítem: la empresa lo compra al precio base
- Incumplimiento de pago: multa 10% → 72h para pagar → bloqueo + derivación a justicia`,
    },
    servers: [{ url: '/api', description: 'API Server (localhost:3000/api)' }],
    tags: [
      { name: 'Auth', description: 'Registro en 2 etapas, login JWT y renovación de tokens' },
      { name: 'Usuarios', description: 'Perfil, métricas, historial y mensajes del postor' },
      { name: 'Medios de Pago', description: 'Gestión de medios de pago del postor' },
      { name: 'Subastas', description: 'Listado, detalle, catálogo y participación en subastas' },
      { name: 'Pujas', description: 'Pujas en tiempo real (complementado con WebSocket)' },
      { name: 'Ítems', description: 'Detalle de piezas del catálogo, ubicación y seguro' },
      { name: 'Solicitudes', description: 'Solicitud de inclusión de artículos propios en subasta' },
      { name: 'Compras', description: 'Compras resultantes de subastas ganadas' },
      { name: 'Rematadores', description: 'Catálogo de rematadores / martilleros' },
      { name: 'Admin - Usuarios', description: '[ADMIN] Aprobación, categorías y verificación de medios de pago' },
      { name: 'Admin - Subastas', description: '[ADMIN] Creación y control del ciclo de vida de subastas' },
      { name: 'Admin - Solicitudes', description: '[ADMIN] Revisión de artículos enviados por usuarios' },
      { name: 'Admin - Ítems', description: '[ADMIN] Registro de seguros y ubicaciones físicas' },
      { name: 'Admin - Compras', description: '[ADMIN] Gestión de pagos y multas' },
      { name: 'Admin - Rematadores', description: '[ADMIN] Alta y modificación de rematadores' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nombre: { type: 'string' },
            apellido: { type: 'string' },
            email: { type: 'string', format: 'email', nullable: true },
            domicilioLegal: { type: 'string' },
            paisOrigen: { type: 'string' },
            categoria: { type: 'string', enum: categoryEnum },
            status: { type: 'string', enum: statusEnum },
            isAdmin: { type: 'boolean' },
            cuentaCobro: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PaymentMethod: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            tipo: { type: 'string', enum: paymentTypeEnum },
            moneda: { type: 'string', enum: currencyEnum },
            banco: { type: 'string', nullable: true },
            numeroCuenta: { type: 'string', nullable: true },
            swift: { type: 'string', nullable: true },
            numeroTarjeta: { type: 'string', nullable: true, description: 'Últimos 4 dígitos' },
            titularTarjeta: { type: 'string', nullable: true },
            vencimiento: { type: 'string', nullable: true },
            montoGarantia: { type: 'number', nullable: true, description: 'Solo cheque certificado' },
            verificado: { type: 'boolean' },
            activo: { type: 'boolean' },
          },
        },
        Auction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            titulo: { type: 'string' },
            descripcion: { type: 'string', nullable: true },
            fechaHora: { type: 'string', format: 'date-time' },
            ubicacion: { type: 'string' },
            categoria: { type: 'string', enum: categoryEnum },
            moneda: { type: 'string', enum: currencyEnum },
            status: { type: 'string', enum: auctionStatusEnum },
            esColeccion: { type: 'boolean' },
            nombreColeccion: { type: 'string', nullable: true },
            rematador: { $ref: '#/components/schemas/Rematador' },
          },
        },
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            numeroPieza: { type: 'string' },
            descripcion: { type: 'string' },
            precioBase: { type: 'number', description: 'Visible solo para usuarios autenticados' },
            status: { type: 'string', enum: ['disponible', 'en_subasta', 'vendido'] },
            currentOwner: {
              type: 'object',
              description: 'Dueño actual del ítem. Cambia al ganador de la subasta.',
              properties: {
                id: { type: 'string' },
                nombre: { type: 'string' },
                apellido: { type: 'string' },
              },
            },
            esObraDeArte: { type: 'boolean' },
            artista: { type: 'string', nullable: true },
            fechaObra: { type: 'string', nullable: true },
            historia: { type: 'string', nullable: true, description: 'Contexto, dueños anteriores, curiosidades' },
            cantidadElementos: { type: 'integer', description: 'Ej: juego de té = 18 piezas' },
            descripcionElementos: { type: 'string', nullable: true },
            images: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' }, orden: { type: 'integer' } } } },
          },
        },
        Puja: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            auctionId: { type: 'string' },
            itemId: { type: 'string' },
            userId: { type: 'string' },
            monto: { type: 'number' },
            moneda: { type: 'string', enum: currencyEnum },
            confirmada: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            user: { type: 'object', properties: { nombre: { type: 'string' }, apellido: { type: 'string' } } },
          },
        },
        Submission: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            descripcion: { type: 'string' },
            datosHistoricos: { type: 'string', nullable: true },
            declaracionPropiedad: { type: 'boolean' },
            origenLicito: { type: 'boolean' },
            status: { type: 'string', enum: submissionStatusEnum },
            precioBaseOfrecido: { type: 'number', nullable: true },
            comisionesInfo: { type: 'string', nullable: true },
            motivoRechazo: { type: 'string', nullable: true },
            cuentaCobro: { type: 'string', nullable: true },
            images: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' } } } },
          },
        },
        Purchase: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            itemId: { type: 'string' },
            buyerId: { type: 'string' },
            montoGanador: { type: 'number' },
            moneda: { type: 'string', enum: currencyEnum },
            comisiones: { type: 'number' },
            costoEnvio: { type: 'number', nullable: true },
            retiraPersonalmente: { type: 'boolean', description: 'Si retira personalmente pierde cobertura del seguro' },
            status: { type: 'string', enum: purchaseStatusEnum },
            multa: { type: 'number', nullable: true, description: '10% del monto ganador si no paga' },
            pagoVencimientoAt: { type: 'string', format: 'date-time', nullable: true, description: 'Vencimiento a 72h de aplicada la multa' },
          },
        },
        Rematador: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nombre: { type: 'string' },
            apellido: { type: 'string' },
            matricula: { type: 'string' },
            email: { type: 'string', nullable: true },
            activo: { type: 'boolean' },
          },
        },
        Mensaje: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            asunto: { type: 'string' },
            cuerpo: { type: 'string' },
            tipo: { type: 'string', enum: ['pago', 'multa', 'resultado', 'submission', 'general'] },
            leido: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Seguro: {
          type: 'object',
          properties: {
            polizaNumero: { type: 'string' },
            polizaGrupoId: { type: 'string', nullable: true },
            valorAsegurado: { type: 'number' },
            beneficiarioId: { type: 'string' },
            proveedor: { type: 'string' },
            contacto: { type: 'string', nullable: true, description: 'Contacto de la aseguradora (el dueño puede aumentar el valor de la póliza)' },
            vencimiento: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        ItemUbicacion: {
          type: 'object',
          properties: {
            deposito: { type: 'string' },
            sector: { type: 'string', nullable: true },
            notas: { type: 'string', nullable: true },
          },
        },
        Metrics: {
          type: 'object',
          properties: {
            totalParticipaciones: { type: 'integer' },
            totalVictorias: { type: 'integer' },
            totalPagadoARS: { type: 'number' },
            totalPagadoUSD: { type: 'number' },
            totalOfertadoARS: { type: 'number' },
            totalOfertadoUSD: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
      },
      responses: {
        Unauthorized: { description: 'Token ausente, inválido o expirado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Forbidden: { description: 'Sin permisos para este recurso', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        NotFound: { description: 'Recurso no encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Conflict: { description: 'Conflicto con el estado actual del recurso', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        Unprocessable: { description: 'Error de validación de campos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      },
    },
    security: [{ BearerAuth: [] }],

    // ─────────────────────────────────────────────────────────────────────────
    paths: {

      // ── AUTH ──────────────────────────────────────────────────────────────
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Registro Etapa 1 — datos personales y fotos de documento',
          description: 'Primera etapa del registro. El postor envía sus datos y las fotos del documento. La empresa verifica la información externamente y le asigna una categoría. El usuario queda en estado "pendiente" hasta ser aprobado por un admin.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['nombre', 'apellido', 'domicilioLegal', 'paisOrigen', 'docFrente', 'docDorso'],
                  properties: {
                    nombre: { type: 'string', example: 'Juan' },
                    apellido: { type: 'string', example: 'Pérez' },
                    domicilioLegal: { type: 'string', example: 'Av. Corrientes 1234, CABA' },
                    paisOrigen: { type: 'string', example: 'Argentina' },
                    docFrente: { type: 'string', format: 'binary', description: 'Foto frente del documento (JPEG/PNG, máx 5MB)' },
                    docDorso: { type: 'string', format: 'binary', description: 'Foto dorso del documento (JPEG/PNG, máx 5MB)' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Usuario registrado. Estado: pendiente. Empresa verificará y enviará email.' },
            400: { description: 'Falta docFrente o docDorso' },
            422: { $ref: '#/components/responses/Unprocessable' },
          },
        },
      },

      '/auth/complete-registration': {
        post: {
          tags: ['Auth'],
          summary: 'Registro Etapa 2 — establecer email y contraseña',
          description: 'El usuario recibe un email con un token único (válido 48 horas) luego de que la empresa aprueba su cuenta. Usa ese token para establecer su email y contraseña personal.',
          security: [],
          requestBody: jsonBody({
            type: 'object',
            required: ['token', 'email', 'password'],
            properties: {
              token: { type: 'string', format: 'uuid', description: 'Token recibido por email al ser aprobado (válido 48h)' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
            },
          }),
          responses: {
            200: { description: 'Registro completado. El usuario ya puede hacer login.' },
            400: { description: 'Password inválida o email mal formado' },
            404: { description: 'Token no encontrado' },
            409: { description: 'Email ya registrado por otro usuario' },
            410: { description: 'Token expirado (pasaron más de 48h)' },
          },
        },
      },

      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Iniciar sesión',
          description: 'Retorna un access token JWT (15 min) y establece un refresh token en cookie httpOnly (7 días).',
          security: [],
          requestBody: jsonBody({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          }),
          responses: {
            200: {
              description: 'Login exitoso',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { accessToken: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } } },
            },
            401: { description: 'Credenciales incorrectas' },
            403: { description: 'Cuenta bloqueada, suspendida o pendiente de aprobación' },
          },
        },
      },

      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Cerrar sesión',
          description: 'Elimina la cookie del refresh token.',
          responses: { 200: { description: 'Sesión cerrada' } },
        },
      },

      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Datos del usuario autenticado',
          responses: {
            200: { description: 'Perfil del usuario autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renovar access token usando refresh token (cookie)',
          security: [],
          description: 'Usa el refresh token almacenado en cookie httpOnly para emitir un nuevo access token sin requerir credenciales.',
          responses: {
            200: { description: 'Nuevo access token', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { accessToken: { type: 'string' } } } } } } } },
            401: { description: 'Refresh token ausente, inválido o expirado' },
          },
        },
      },

      // ── USUARIOS ──────────────────────────────────────────────────────────
      '/users/{id}': {
        get: {
          tags: ['Usuarios'],
          summary: 'Obtener perfil de usuario',
          description: 'Solo el propio usuario o un administrador pueden consultarlo.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Perfil completo', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Usuarios'],
          summary: 'Actualizar perfil',
          description: 'Permite actualizar domicilio legal y cuenta de cobro (para recibir el producido de ventas). La cuenta de cobro debe declararse antes del inicio de la subasta.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            properties: {
              domicilioLegal: { type: 'string' },
              cuentaCobro: { type: 'string', description: 'Cuenta bancaria para recibir el producido (puede ser del exterior)' },
            },
          }),
          responses: {
            200: { description: 'Perfil actualizado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/users/{id}/metrics': {
        get: {
          tags: ['Usuarios'],
          summary: 'Métricas de participación del usuario',
          description: 'Estadísticas: subastas asistidas, victorias, totales ofertados y pagados por moneda.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Métricas calculadas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Metrics' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/users/{id}/messages': {
        get: {
          tags: ['Usuarios'],
          summary: 'Listar mensajes privados',
          description: 'Notificaciones de compras, multas y resultados de solicitudes. Se puede filtrar por estado de lectura.',
          parameters: [
            idParam(),
            { name: 'leido', in: 'query', schema: { type: 'boolean' }, description: 'Filtrar por leído (true) o no leído (false)' },
            pageParam,
          ],
          responses: {
            200: { description: 'Lista de mensajes', content: { 'application/json': { schema: { type: 'object', properties: { messages: { type: 'array', items: { $ref: '#/components/schemas/Mensaje' } }, total: { type: 'integer' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/users/{id}/messages/{msgId}/read': {
        put: {
          tags: ['Usuarios'],
          summary: 'Marcar mensaje como leído',
          parameters: [idParam(), idParam('msgId')],
          responses: {
            200: { description: 'Mensaje marcado como leído' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/users/{id}/auction-history': {
        get: {
          tags: ['Usuarios'],
          summary: 'Historial de subastas en las que participó el usuario',
          parameters: [idParam(), pageParam],
          responses: {
            200: { description: 'Lista de subastas con datos de participación' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/users/{id}/purchases': {
        get: {
          tags: ['Usuarios'],
          summary: 'Compras realizadas por el usuario',
          description: 'Artículos ganados en subastas con detalle de pago y estado.',
          parameters: [idParam(), pageParam],
          responses: {
            200: { description: 'Lista de compras', content: { 'application/json': { schema: { type: 'object', properties: { purchases: { type: 'array', items: { $ref: '#/components/schemas/Purchase' } }, total: { type: 'integer' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/users/{id}/submissions': {
        get: {
          tags: ['Usuarios'],
          summary: 'Solicitudes de inclusión de artículos del usuario',
          parameters: [idParam(), pageParam],
          responses: {
            200: { description: 'Lista de solicitudes', content: { 'application/json': { schema: { type: 'object', properties: { submissions: { type: 'array', items: { $ref: '#/components/schemas/Submission' } }, total: { type: 'integer' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      // ── MEDIOS DE PAGO ────────────────────────────────────────────────────
      '/users/{id}/payment-methods': {
        get: {
          tags: ['Medios de Pago'],
          summary: 'Listar medios de pago activos del usuario',
          parameters: [idParam()],
          responses: {
            200: { description: 'Lista de medios de pago', content: { 'application/json': { schema: { type: 'object', properties: { paymentMethods: { type: 'array', items: { $ref: '#/components/schemas/PaymentMethod' } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['Medios de Pago'],
          summary: 'Agregar medio de pago',
          description: 'Se agrega en estado no verificado. Un admin debe verificarlo antes de que el usuario pueda pujar. Subastas en USD requieren tarjeta internacional o cuenta bancaria extranjera con moneda USD. El cheque certificado requiere montoGarantia y debe verificarse antes del inicio de la subasta.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['tipo', 'moneda'],
            properties: {
              tipo: { type: 'string', enum: paymentTypeEnum },
              moneda: { type: 'string', enum: currencyEnum },
              banco: { type: 'string', description: 'Para cuentas bancarias' },
              numeroCuenta: { type: 'string', description: 'CBU / IBAN / número de cuenta' },
              swift: { type: 'string', description: 'Para cuentas extranjeras' },
              numeroTarjeta: { type: 'string', description: 'Últimos 4 dígitos' },
              titularTarjeta: { type: 'string' },
              vencimiento: { type: 'string', example: '12/27' },
              montoGarantia: { type: 'number', description: 'Solo para cheque certificado. Las compras no pueden superar este monto.' },
            },
          }),
          responses: {
            201: { description: 'Medio de pago agregado (pendiente de verificación)' },
            400: { description: 'Tipo incompatible con la moneda seleccionada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            422: { $ref: '#/components/responses/Unprocessable' },
          },
        },
      },

      '/users/{id}/payment-methods/{pmId}': {
        put: {
          tags: ['Medios de Pago'],
          summary: 'Actualizar medio de pago',
          parameters: [idParam(), idParam('pmId')],
          requestBody: jsonBody({
            type: 'object',
            properties: {
              banco: { type: 'string' },
              numeroCuenta: { type: 'string' },
              swift: { type: 'string' },
              numeroTarjeta: { type: 'string' },
              titularTarjeta: { type: 'string' },
              vencimiento: { type: 'string' },
              montoGarantia: { type: 'number' },
            },
          }),
          responses: {
            200: { description: 'Medio de pago actualizado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Medios de Pago'],
          summary: 'Eliminar medio de pago (soft delete)',
          parameters: [idParam(), idParam('pmId')],
          responses: {
            200: { description: 'Medio de pago desactivado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── SUBASTAS ──────────────────────────────────────────────────────────
      '/auctions': {
        get: {
          tags: ['Subastas'],
          summary: 'Listar subastas',
          description: 'Listado público con filtros opcionales. El precio base de los ítems solo es visible para usuarios autenticados.',
          security: [],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: auctionStatusEnum } },
            { name: 'categoria', in: 'query', schema: { type: 'string', enum: categoryEnum } },
            { name: 'moneda', in: 'query', schema: { type: 'string', enum: currencyEnum } },
            pageParam,
          ],
          responses: {
            200: { description: 'Lista de subastas con rematador y contadores', content: { 'application/json': { schema: { type: 'object', properties: { auctions: { type: 'array', items: { $ref: '#/components/schemas/Auction' } }, total: { type: 'integer' }, page: { type: 'integer' } } } } } },
          },
        },
      },

      '/auctions/{id}': {
        get: {
          tags: ['Subastas'],
          summary: 'Detalle de una subasta',
          security: [],
          parameters: [idParam()],
          responses: {
            200: { description: 'Datos completos de la subasta', content: { 'application/json': { schema: { $ref: '#/components/schemas/Auction' } } } },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/auctions/{id}/catalog': {
        get: {
          tags: ['Subastas'],
          summary: 'Catálogo de ítems de la subasta',
          description: 'El catálogo es público, pero el campo **precioBase** solo aparece si el usuario está autenticado (token Bearer presente). Solo usuarios registrados (de cualquier categoría) pueden ver el precio base.',
          security: [],
          parameters: [idParam()],
          responses: {
            200: { description: 'Lista de ítems. precioBase incluido solo si el usuario está autenticado.', content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Item' } } } } } } },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/auctions/{id}/current-item': {
        get: {
          tags: ['Subastas'],
          summary: 'Ítem que se está subastando actualmente',
          description: 'Devuelve el ítem activo, la mejor oferta y el mejor postor hasta el momento.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Ítem actual con mejor oferta', content: { 'application/json': { schema: { type: 'object', properties: { item: { $ref: '#/components/schemas/Item' }, mejorOferta: { type: 'number', nullable: true }, mejorPostor: { type: 'object', nullable: true, properties: { nombre: { type: 'string' }, apellido: { type: 'string' } } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/auctions/{id}/bids': {
        get: {
          tags: ['Subastas'],
          summary: 'Historial de pujas del ítem activo',
          description: 'Lista todas las pujas confirmadas del ítem actualmente en subasta, en orden descendente.',
          parameters: [idParam(), pageParam],
          responses: {
            200: { description: 'Historial de pujas', content: { 'application/json': { schema: { type: 'object', properties: { bids: { type: 'array', items: { $ref: '#/components/schemas/Puja' } }, total: { type: 'integer' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        post: {
          tags: ['Pujas'],
          summary: '⭐ Realizar una puja',
          description: `Endpoint principal del sistema de pujas dinámicas ascendentes.

**Validaciones aplicadas:**
- Usuario con status \`aprobado\` y conectado a esta subasta
- Al menos un medio de pago verificado
- Subasta en USD → el medio debe ser tarjeta_credito_internacional o cuenta_bancaria_extranjera con moneda USD
- Cheque certificado → la suma de compras pendientes + nuevo monto ≤ montoGarantia
- Rango de puja (NO aplica a subastas oro/platino):
  - Mínimo = última oferta + 1% × precio base
  - Máximo = última oferta + 20% × precio base
- No puede haber otra puja pendiente de confirmación para el mismo ítem

Usa **pg_advisory_lock** en PostgreSQL para serializar pujas concurrentes sin race conditions.
Al confirmar, emite evento \`bid:new\` por WebSocket a todos los conectados.`,
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['monto', 'paymentMethodId'],
            properties: {
              monto: { type: 'number', description: 'Monto a ofertar en la moneda de la subasta' },
              paymentMethodId: { type: 'string', description: 'ID del medio de pago verificado del usuario' },
            },
          }),
          responses: {
            201: { description: 'Puja registrada y confirmada. Evento bid:new emitido por WebSocket.' },
            400: { description: 'Subasta no abierta o sin ítem activo' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { description: 'No conectado a la subasta, cuenta no aprobada o medio de pago incompatible con la moneda' },
            404: { $ref: '#/components/responses/NotFound' },
            409: { description: 'Ya existe una puja pendiente de confirmación para este ítem' },
            422: { description: 'Monto fuera del rango permitido (menor al mínimo o mayor al máximo)' },
          },
        },
      },

      '/auctions/{id}/participants': {
        get: {
          tags: ['Subastas'],
          summary: 'Usuarios conectados actualmente a la subasta',
          parameters: [idParam()],
          responses: {
            200: { description: 'Lista de participantes activos', content: { 'application/json': { schema: { type: 'object', properties: { participants: { type: 'array', items: { type: 'object', properties: { user: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, apellido: { type: 'string' }, categoria: { type: 'string' } } } } } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      '/auctions/{id}/join': {
        post: {
          tags: ['Subastas'],
          summary: 'Conectarse a una subasta',
          description: 'Valida: cuenta aprobada, categoría del usuario ≥ categoría de la subasta, no estar ya en otra subasta. Retorna `canBid: true` si tiene al menos un medio de pago verificado, de lo contrario solo puede ver.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Conectado. canBid indica si puede pujar o solo ver.', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { canBid: { type: 'boolean' } } } } } } } },
            400: { description: 'La subasta no está abierta' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { description: 'Cuenta no aprobada o categoría del usuario insuficiente para esta subasta' },
            404: { $ref: '#/components/responses/NotFound' },
            409: { description: 'Usuario ya conectado a otra subasta (solo 1 permitida a la vez)' },
          },
        },
      },

      '/auctions/{id}/leave': {
        delete: {
          tags: ['Subastas'],
          summary: 'Desconectarse de la subasta',
          parameters: [idParam()],
          responses: {
            200: { description: 'Desconectado exitosamente' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // ── ÍTEMS ─────────────────────────────────────────────────────────────
      '/items/{id}': {
        get: {
          tags: ['Ítems'],
          summary: 'Detalle de un ítem del catálogo',
          description: 'Si el usuario está autenticado se incluye precioBase. Para obras de arte incluye artista, fechaObra e historia (contexto, dueños anteriores, curiosidades).',
          security: [],
          parameters: [idParam()],
          responses: {
            200: { description: 'Datos del ítem con imágenes', content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } } },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/items/{id}/bids': {
        get: {
          tags: ['Ítems'],
          summary: 'Historial completo de pujas de un ítem',
          security: [],
          parameters: [idParam()],
          responses: {
            200: { description: 'Pujas confirmadas ordenadas por fecha', content: { 'application/json': { schema: { type: 'object', properties: { bids: { type: 'array', items: { $ref: '#/components/schemas/Puja' } }, mejorOferta: { type: 'number', nullable: true } } } } } },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/items/{id}/location': {
        get: {
          tags: ['Ítems'],
          summary: 'Ubicación física del ítem en depósito',
          description: 'Solo accesible para el dueño actual del ítem o un administrador.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Datos de ubicación', content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemUbicacion' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/items/{id}/insurance': {
        get: {
          tags: ['Ítems'],
          summary: 'Póliza de seguro del ítem',
          description: 'Solo accesible para el dueño actual o un admin. El dueño puede contactar a la aseguradora para aumentar el valor de la póliza pagando la diferencia del premio.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Datos de la póliza de seguro', content: { 'application/json': { schema: { $ref: '#/components/schemas/Seguro' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── SOLICITUDES ───────────────────────────────────────────────────────
      '/submissions': {
        post: {
          tags: ['Solicitudes'],
          summary: 'Solicitar inclusión de artículo propio en subasta',
          description: 'El usuario envía su bien para que la empresa lo evalúe. Flujo: usuario envía → empresa inspecciona → acepta/rechaza → propone precio y comisiones → usuario acepta o rechaza. Si acepta y envía el bien físicamente y es rechazado tras inspección, el bien es devuelto con cargo.',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['descripcion', 'declaracionPropiedad', 'images'],
                  properties: {
                    descripcion: { type: 'string' },
                    datosHistoricos: { type: 'string', description: 'Historia del objeto: contexto, dueños anteriores, curiosidades' },
                    declaracionPropiedad: { type: 'boolean', description: 'DEBE ser true. Declara que el bien pertenece al usuario y no tiene impedimentos legales.' },
                    origenLicito: { type: 'boolean', description: 'Confirma que puede acreditar el origen lícito del bien si fuera requerido' },
                    cuentaCobro: { type: 'string', description: 'Cuenta bancaria para recibir el producido de la venta (puede ser del exterior). Debe declararse antes del inicio de la subasta.' },
                    images: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Mínimo 6 imágenes del bien (JPEG/PNG/WEBP, máx 5MB c/u)' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Solicitud enviada. Estado: pendiente_empresa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Submission' } } } },
            400: { description: 'Menos de 6 imágenes o declaracionPropiedad no es true' },
            401: { $ref: '#/components/responses/Unauthorized' },
            422: { $ref: '#/components/responses/Unprocessable' },
          },
        },
      },

      '/submissions/{id}': {
        get: {
          tags: ['Solicitudes'],
          summary: 'Detalle de una solicitud',
          description: 'Solo el dueño de la solicitud o un admin pueden consultarla. Incluye imágenes, estado actual, propuesta de precio (si aplica) y motivo de rechazo.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Datos de la solicitud', content: { 'application/json': { schema: { $ref: '#/components/schemas/Submission' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/submissions/{id}/user-accept': {
        patch: {
          tags: ['Solicitudes'],
          summary: 'Aceptar la propuesta de precio y comisiones de la empresa',
          description: 'Solo válido cuando el status es `precio_propuesto`. El bien ingresará a una futura subasta. La empresa informa fecha, hora, lugar, precio base y comisiones.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Propuesta aceptada. Status: aceptada_usuario.' },
            400: { description: 'El status de la solicitud no es precio_propuesto' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/submissions/{id}/user-reject': {
        patch: {
          tags: ['Solicitudes'],
          summary: 'Rechazar la propuesta de precio o comisiones de la empresa',
          description: 'Solo válido cuando el status es `precio_propuesto`. Se procede a la devolución del bien con cargo al usuario. Se informa el costo de los gastos de devolución.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Propuesta rechazada. Status: rechazada_usuario. Se informarán los gastos de devolución.' },
            400: { description: 'El status no es precio_propuesto' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── REMATADORES ───────────────────────────────────────────────────────
      '/auctioneers': {
        get: {
          tags: ['Rematadores'],
          summary: 'Listar rematadores activos',
          security: [],
          responses: {
            200: { description: 'Lista de rematadores', content: { 'application/json': { schema: { type: 'object', properties: { auctioneers: { type: 'array', items: { $ref: '#/components/schemas/Rematador' } } } } } } },
          },
        },
      },

      // ── COMPRAS ───────────────────────────────────────────────────────────
      '/purchases/{id}': {
        get: {
          tags: ['Compras'],
          summary: 'Detalle de una compra',
          description: 'Solo el comprador o un admin pueden consultarla. Incluye monto ganador, comisiones, costo de envío a la dirección declarada y estado de pago.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Datos de la compra', content: { 'application/json': { schema: { $ref: '#/components/schemas/Purchase' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/purchases/{id}/retire': {
        patch: {
          tags: ['Compras'],
          summary: 'Marcar retiro personal del bien',
          description: 'El comprador indica que retirará el bien personalmente en lugar de recibirlo por envío. **Al hacerlo pierde la cobertura del seguro** contratado por la empresa.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Retiro personal registrado. Se pierde cobertura del seguro.' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      // ── ADMIN — USUARIOS ──────────────────────────────────────────────────
      '/admin/users': {
        get: {
          tags: ['Admin - Usuarios'],
          summary: '[ADMIN] Listar todos los usuarios del sistema',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: statusEnum } },
            { name: 'categoria', in: 'query', schema: { type: 'string', enum: categoryEnum } },
            pageParam,
          ],
          responses: {
            200: { description: 'Lista de usuarios', content: { 'application/json': { schema: { type: 'object', properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } }, total: { type: 'integer' } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/admin/users/{id}/category': {
        patch: {
          tags: ['Admin - Usuarios'],
          summary: '[ADMIN] Asignar categoría al postor',
          description: 'La categoría determina en qué subastas puede participar (comun < especial < plata < oro < platino). La empresa asigna la categoría según la investigación realizada.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['categoria'],
            properties: { categoria: { type: 'string', enum: categoryEnum } },
          }),
          responses: {
            200: { description: 'Categoría asignada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/admin/users/{id}/status': {
        patch: {
          tags: ['Admin - Usuarios'],
          summary: '[ADMIN] Aprobar / suspender / bloquear usuario',
          description: 'Al aprobar con `email`: genera token único (48h) y envía email para que el usuario complete el registro (Etapa 2) y genere su clave personal. Al bloquear: el usuario pierde acceso a todos los servicios de la aplicación.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string', enum: ['aprobado', 'suspendido', 'bloqueado'] },
              email: { type: 'string', format: 'email', description: 'Requerido al aprobar por primera vez. Se envía el email de registro Etapa 2.' },
            },
          }),
          responses: {
            200: { description: 'Estado actualizado. Si se aprobó con email, se envió el email de registro.' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/admin/users/{id}/payment-methods/{pmId}/verify': {
        patch: {
          tags: ['Admin - Usuarios'],
          summary: '[ADMIN] Verificar o desverificar un medio de pago',
          description: 'Solo los medios verificados permiten pujar. El cheque certificado debe verificarse ANTES del inicio de la subasta.',
          parameters: [idParam(), idParam('pmId')],
          requestBody: jsonBody({
            type: 'object',
            required: ['verificado'],
            properties: { verificado: { type: 'boolean' } },
          }),
          responses: {
            200: { description: 'Estado de verificación actualizado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── ADMIN — SUBASTAS ──────────────────────────────────────────────────
      '/admin/auctions': {
        post: {
          tags: ['Admin - Subastas'],
          summary: '[ADMIN] Crear subasta',
          description: 'La moneda se define al crear y no puede cambiarse. No es posible crear subastas bimonetarias. Una subasta puede ser una "colección" cuando contiene artículos de un mismo dueño.',
          requestBody: jsonBody({
            type: 'object',
            required: ['titulo', 'fechaHora', 'ubicacion', 'categoria', 'moneda', 'rematadorId'],
            properties: {
              titulo: { type: 'string' },
              descripcion: { type: 'string' },
              fechaHora: { type: 'string', format: 'date-time' },
              ubicacion: { type: 'string' },
              categoria: { type: 'string', enum: categoryEnum, description: 'Determina qué postores pueden acceder' },
              moneda: { type: 'string', enum: currencyEnum, description: 'ARS o USD. No bimonetaria.' },
              rematadorId: { type: 'string' },
              esColeccion: { type: 'boolean', default: false },
              nombreColeccion: { type: 'string', description: 'Usualmente el nombre del dueño de los artículos' },
            },
          }),
          responses: {
            201: { description: 'Subasta creada en estado programada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Auction' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/admin/auctions/{id}': {
        put: {
          tags: ['Admin - Subastas'],
          summary: '[ADMIN] Actualizar datos de la subasta',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              descripcion: { type: 'string' },
              fechaHora: { type: 'string', format: 'date-time' },
              ubicacion: { type: 'string' },
              rematadorId: { type: 'string' },
              esColeccion: { type: 'boolean' },
              nombreColeccion: { type: 'string' },
            },
          }),
          responses: {
            200: { description: 'Subasta actualizada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/admin/auctions/{id}/status': {
        patch: {
          tags: ['Admin - Subastas'],
          summary: '[ADMIN] Cambiar estado de la subasta',
          description: 'Flujo de estados: programada → abierta → cerrada → finalizada.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['status'],
            properties: { status: { type: 'string', enum: ['abierta', 'cerrada', 'finalizada'] } },
          }),
          responses: {
            200: { description: 'Estado actualizado' },
            400: { description: 'Transición de estado inválida' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/admin/auctions/{id}/items': {
        post: {
          tags: ['Admin - Subastas'],
          summary: '[ADMIN] Agregar ítem al catálogo de la subasta',
          description: 'El ítem debe estar en estado "disponible". Pasa a estado "en_subasta".',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['itemId'],
            properties: { itemId: { type: 'string', description: 'ID del ítem en estado disponible' } },
          }),
          responses: {
            200: { description: 'Ítem agregado al catálogo. Status: en_subasta.' },
            400: { description: 'El ítem no está disponible' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/admin/auctions/{id}/items/{itemId}/close': {
        patch: {
          tags: ['Admin - Subastas'],
          summary: '[ADMIN] 🔨 Cerrar puja y adjudicar ítem',
          description: 'Determina al ganador (última puja confirmada). Crea Purchase con comisiones (5%). Si nadie pujó, la empresa compra el ítem al precio base. Emite `item:sold` y `auction:item-changed` por WebSocket. Envía mensaje privado al ganador con importe + comisiones + costo de envío a dirección declarada.',
          parameters: [idParam(), idParam('itemId')],
          responses: {
            200: { description: 'Ítem adjudicado. Purchase creado. Eventos WebSocket emitidos.' },
            400: { description: 'No hay ítem activo en la subasta' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── ADMIN — SOLICITUDES ───────────────────────────────────────────────
      '/admin/submissions': {
        get: {
          tags: ['Admin - Solicitudes'],
          summary: '[ADMIN] Listar todas las solicitudes',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: submissionStatusEnum } },
            pageParam,
          ],
          responses: {
            200: { description: 'Lista de solicitudes con datos del usuario' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/admin/submissions/{id}/accept': {
        patch: {
          tags: ['Admin - Solicitudes'],
          summary: '[ADMIN] Aceptar solicitud y proponer precio base + comisiones',
          description: 'La empresa acepta el artículo y propone condiciones. El usuario recibirá notificación y deberá aceptar o rechazar la propuesta.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['precioBaseOfrecido', 'comisionesInfo'],
            properties: {
              precioBaseOfrecido: { type: 'number', description: 'Precio base que se usará en la subasta' },
              comisionesInfo: { type: 'string', description: 'Descripción de las comisiones que cobrará la empresa' },
            },
          }),
          responses: {
            200: { description: 'Propuesta enviada. Status: precio_propuesto.' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/admin/submissions/{id}/reject': {
        patch: {
          tags: ['Admin - Solicitudes'],
          summary: '[ADMIN] Rechazar solicitud',
          description: 'El bien es devuelto al dueño con cargo. El usuario puede ver el motivo en la app.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['motivoRechazo'],
            properties: { motivoRechazo: { type: 'string' } },
          }),
          responses: {
            200: { description: 'Solicitud rechazada. Status: rechazada_empresa.' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── ADMIN — ÍTEMS ─────────────────────────────────────────────────────
      '/admin/items': {
        get: {
          tags: ['Admin - Ítems'],
          summary: '[ADMIN] Listar todos los ítems del sistema',
          responses: {
            200: { description: 'Lista de ítems con imagen principal' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/admin/items/{id}/insurance': {
        patch: {
          tags: ['Admin - Ítems'],
          summary: '[ADMIN] Registrar o actualizar póliza de seguro del ítem',
          description: 'La empresa contrata un seguro por cada bien recibido en función del valor base. El seguro puede cubrir varias piezas del mismo dueño (polizaGrupoId). El beneficiario es siempre el dueño del ítem.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['polizaNumero', 'valorAsegurado', 'proveedor', 'beneficiarioId'],
            properties: {
              polizaNumero: { type: 'string' },
              valorAsegurado: { type: 'number' },
              proveedor: { type: 'string', description: 'Nombre de la compañía aseguradora' },
              beneficiarioId: { type: 'string', description: 'ID del usuario dueño (beneficiario de la póliza)' },
              vencimiento: { type: 'string', format: 'date-time' },
              contacto: { type: 'string', description: 'Datos de contacto de la aseguradora para aumentar el valor de la póliza' },
              polizaGrupoId: { type: 'string', description: 'Para pólizas que cubren varias piezas del mismo dueño' },
            },
          }),
          responses: {
            200: { description: 'Póliza registrada o actualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Seguro' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/admin/items/{id}/location': {
        patch: {
          tags: ['Admin - Ítems'],
          summary: '[ADMIN] Actualizar ubicación física del ítem',
          description: 'Registra en qué depósito se encuentra el ítem. El dueño puede consultar esta información desde la app.',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            required: ['deposito'],
            properties: {
              deposito: { type: 'string', description: 'Nombre o código del depósito' },
              sector: { type: 'string' },
              notas: { type: 'string' },
            },
          }),
          responses: {
            200: { description: 'Ubicación actualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemUbicacion' } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── ADMIN — COMPRAS ───────────────────────────────────────────────────
      '/admin/purchases': {
        get: {
          tags: ['Admin - Compras'],
          summary: '[ADMIN] Listar todas las compras',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: purchaseStatusEnum } },
            pageParam,
          ],
          responses: {
            200: { description: 'Lista de compras con ítem y comprador' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/admin/purchases/{id}/fine': {
        patch: {
          tags: ['Admin - Compras'],
          summary: '[ADMIN] Aplicar multa del 10% por incumplimiento de pago',
          description: 'Aplica multa equivalente al 10% del valor ofertado. Establece plazo de 72 horas para presentar los fondos. Un cron job horario verifica vencimientos: si no pagó → bloquea al usuario y deriva el caso a la justicia (usuario pierde acceso a todos los servicios).',
          parameters: [idParam()],
          responses: {
            200: { description: 'Multa aplicada. Plazo de 72h iniciado. Notificación enviada al usuario.' },
            400: { description: 'Estado de la compra no es pendiente_pago' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      '/admin/purchases/{id}/paid': {
        patch: {
          tags: ['Admin - Compras'],
          summary: '[ADMIN] Marcar compra como pagada',
          description: 'Confirma que el usuario pagó. Evalúa automáticamente si corresponde upgrade de categoría según actividad total del usuario.',
          parameters: [idParam()],
          responses: {
            200: { description: 'Compra marcada como pagada. Se evalúa upgrade de categoría.' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ── ADMIN — REMATADORES ───────────────────────────────────────────────
      '/admin/auctioneers': {
        get: {
          tags: ['Admin - Rematadores'],
          summary: '[ADMIN] Listar todos los rematadores',
          responses: {
            200: { description: 'Lista completa (incluye inactivos)', content: { 'application/json': { schema: { type: 'object', properties: { auctioneers: { type: 'array', items: { $ref: '#/components/schemas/Rematador' } } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['Admin - Rematadores'],
          summary: '[ADMIN] Crear rematador',
          requestBody: jsonBody({
            type: 'object',
            required: ['nombre', 'apellido', 'matricula'],
            properties: {
              nombre: { type: 'string' },
              apellido: { type: 'string' },
              matricula: { type: 'string', description: 'Número de matrícula profesional (único)' },
              email: { type: 'string', format: 'email' },
            },
          }),
          responses: {
            201: { description: 'Rematador creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Rematador' } } } },
            400: { description: 'Matrícula ya registrada' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },

      '/admin/auctioneers/{id}': {
        put: {
          tags: ['Admin - Rematadores'],
          summary: '[ADMIN] Actualizar datos del rematador',
          parameters: [idParam()],
          requestBody: jsonBody({
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              apellido: { type: 'string' },
              email: { type: 'string', format: 'email' },
              activo: { type: 'boolean' },
            },
          }),
          responses: {
            200: { description: 'Rematador actualizado' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
    },
    // ─────────────────────────────────────────────────────────────────────────
  },
  apis: [],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Application) {
  app.get('/api/docs.json', (_req, res) => res.json(specs));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customSiteTitle: 'Subastas API Docs',
    swaggerOptions: { docExpansion: 'none', filter: true, showExtensions: true },
  }));
}
