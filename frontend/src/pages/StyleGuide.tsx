/* Página de referencia visual de la paleta y tokens de SubastApp.
   Sirve para verificar que los estilos coincidan con design-reference/. */

type Swatch = { name: string; varName: string; hex: string; note?: string };

const primarios: Swatch[] = [
  { name: 'Primary/Dark', varName: '--color-primary-dark', hex: '#0F3460', note: 'headers, botones primarios' },
  { name: 'Primary/Main', varName: '--color-primary', hex: '#1D4E89', note: 'acciones principales' },
  { name: 'Primary/Light', varName: '--color-primary-light', hex: '#2A6CB5' },
];

const acento: Swatch[] = [
  { name: 'Accent/Gold', varName: '--color-accent', hex: '#C9A84C', note: 'importes, pujas ganadoras' },
  { name: 'Accent/Light', varName: '--color-accent-light', hex: '#E8D5A0' },
];

const semanticos: Swatch[] = [
  { name: 'Success', varName: '--color-success', hex: '#1D9E75', note: 'ganado / pago realizado' },
  { name: 'Danger', varName: '--color-danger', hex: '#E24B4A', note: 'error / perdido / multa' },
  { name: 'Warning', varName: '--color-warning', hex: '#EF9F27', note: 'pendiente / próxima' },
];

const categorias: Swatch[] = [
  { name: 'Común', varName: '--color-cat-comun', hex: '#888780' },
  { name: 'Especial', varName: '--color-cat-especial', hex: '#378ADD' },
  { name: 'Plata', varName: '--color-cat-plata', hex: '#B4B2A9' },
  { name: 'Oro', varName: '--color-cat-oro', hex: '#EF9F27' },
  { name: 'Platino', varName: '--color-cat-platino', hex: '#7F77DD' },
];

const neutros: Swatch[] = [
  { name: 'Fondo', varName: '--color-bg', hex: '#E5E3DD' },
  { name: 'Surface', varName: '--color-surface', hex: '#FFFFFF' },
  { name: 'Border', varName: '--color-border', hex: '#D8D6CF' },
  { name: 'Texto', varName: '--color-text', hex: '#1A1A1A' },
  { name: 'Texto muted', varName: '--color-text-muted', hex: '#6B6B6B' },
];

function SwatchCard({ s }: { s: Swatch }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      <div style={{ background: `var(${s.varName})`, height: 72, borderBottom: '1px solid var(--color-border)' }} />
      <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
        <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>{s.name}</div>
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.hex}</code>
        {s.note && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{s.note}</div>}
      </div>
    </div>
  );
}

function Section({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <section style={{ marginBottom: 'var(--space-xl)' }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-md)' }}>
        {swatches.map((s) => <SwatchCard key={s.varName} s={s} />)}
      </div>
    </section>
  );
}

export default function StyleGuide() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Header con gradiente de marca */}
      <header style={{ background: 'var(--gradient-brand)', color: 'var(--color-text-on-primary)', padding: 'var(--space-xl) var(--space-lg)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>SubastApp</div>
        <h1 style={{ fontSize: 'var(--font-size-xl)' }}>Style Guide</h1>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-lg)' }}>
        <Section title="Primarios" swatches={primarios} />
        <Section title="Acento" swatches={acento} />
        <Section title="Semánticos" swatches={semanticos} />
        <Section title="Categorías de usuario" swatches={categorias} />
        <Section title="Neutros" swatches={neutros} />

        {/* Componentes de ejemplo */}
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>Componentes</h2>

          {/* Filtros pill */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
            <button style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: 'none', borderRadius: 'var(--radius-pill)', padding: '8px 18px', fontWeight: 'var(--font-weight-medium)', boxShadow: 'var(--shadow-card)' }}>Todas</button>
            {['Hoy', 'Próximas', 'Mis subastas'].map((t) => (
              <button key={t} style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)', padding: '8px 18px' }}>{t}</button>
            ))}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <span style={{ background: 'var(--color-danger)', color: '#fff', borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)' }}>EN VIVO</span>
            <span style={{ background: 'var(--color-accent)', color: '#fff', borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)' }}>ORO</span>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 20px', fontWeight: 'var(--font-weight-medium)' }}>Primario</button>
            <button style={{ background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 20px', fontWeight: 'var(--font-weight-medium)' }}>Acento</button>
            <button style={{ background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '10px 20px' }}>Secundario</button>
          </div>
        </section>
      </div>
    </div>
  );
}
