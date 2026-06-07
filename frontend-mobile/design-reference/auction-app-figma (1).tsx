import { useState } from "react";

const COLORS = {
  primary: "#1D4E89",
  primaryLight: "#2A6CB5",
  primaryDark: "#0F3460",
  accent: "#C9A84C",
  accentLight: "#E8D5A0",
  accentDark: "#A68A2E",
  success: "#1D9E75",
  danger: "#E24B4A",
  warning: "#EF9F27",
  bg: "#F8F7F4",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#6B6B6B",
  textMuted: "#9A9A9A",
  border: "#E5E3DD",
  borderLight: "#F0EEE8",
  categorias: {
    comun: "#888780",
    especial: "#378ADD",
    plata: "#B4B2A9",
    oro: "#EF9F27",
    platino: "#7F77DD",
  },
};

const screens = [
  "splash",
  "login",
  "registro1",
  "registro2",
  "home",
  "catalogo",
  "detalle_pieza",
  "subasta_vivo",
  "factura",
  "perfil",
  "mis_subastas",
  "medios_pago",
  "agregar_pago",
  "solicitar_subasta",
  "metricas",
  "paleta",
  "navegacion",
  "endpoints",
];

const screenNames = {
  splash: "Splash screen",
  login: "Login",
  registro1: "Registro paso 1",
  registro2: "Registro paso 2",
  home: "Home - Subastas",
  catalogo: "Catálogo",
  detalle_pieza: "Detalle de pieza",
  subasta_vivo: "Subasta en vivo",
  factura: "Factura de compra",
  perfil: "Mi perfil",
  mis_subastas: "Mis subastas",
  medios_pago: "Medios de pago",
  agregar_pago: "Agregar medio pago",
  solicitar_subasta: "Solicitar subasta",
  metricas: "Métricas",
  paleta: "Paleta de colores",
  navegacion: "Mapa de navegación",
  endpoints: "API Endpoints",
};

const Phone = ({ children }) => (
  <div style={{ width: 375, height: 812, borderRadius: 40, background: "#000", padding: 4, position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", flexShrink: 0 }}>
    <div style={{ width: "100%", height: "100%", borderRadius: 36, background: COLORS.bg, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, display: "flex", justifyContent: "center", alignItems: "flex-end", zIndex: 10, paddingBottom: 4 }}>
        <div style={{ width: 120, height: 28, background: "#000", borderRadius: 14 }} />
      </div>
      <div style={{ height: "100%", overflowY: "auto", position: "relative" }}>
        {children}
      </div>
    </div>
  </div>
);

const StatusBar = ({ light }) => (
  <div style={{ height: 44, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px 4px", color: light ? "#fff" : COLORS.text, fontSize: 12, fontWeight: 500 }}>
    <span>9:41</span>
    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="1" fill="currentColor" /><rect x="4.5" y="4" width="3" height="8" rx="1" fill="currentColor" /><rect x="9" y="1.5" width="3" height="10.5" rx="1" fill="currentColor" /><rect x="13" y="0" width="3" height="12" rx="1" fill="currentColor" /></svg>
      <svg width="22" height="12" viewBox="0 0 22 12"><rect x="0" y="0" width="20" height="12" rx="2" stroke="currentColor" fill="none" strokeWidth="1" /><rect x="20.5" y="3.5" width="2" height="5" rx="1" fill="currentColor" /><rect x="1.5" y="1.5" width="15" height="9" rx="1" fill="currentColor" /></svg>
    </span>
  </div>
);

const NavBar = ({ title, back, light }) => (
  <div style={{ height: 48, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
    {back && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke={light ? "#fff" : COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    <span style={{ fontSize: 18, fontWeight: 600, color: light ? "#fff" : COLORS.text }}>{title}</span>
  </div>
);

const BottomNav = ({ active }) => {
  const icons = [
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12l1.5-1.5L12 4l6.5 6.5L20 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 10.5V20a1 1 0 001 1h3.5a1 1 0 001-1v-4.5a1 1 0 011-1h1a1 1 0 011 1V20a1 1 0 001 1H19a1 1 0 001-1v-9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 12v4m0 0l-1.5-1.5M12 16l1.5-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 20h2V12h-2v8zm5 0h2V8H9v12zm5 0h2V4h-2v16zm5 0h2v-6h-2v6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  ];
  const labels = ["Inicio", "Subastas", "Vender", "Métricas", "Perfil"];
  return (
    <div style={{ position: "sticky", bottom: 0, height: 80, background: COLORS.card, borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px 16px" }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: active === i ? COLORS.primary : COLORS.textMuted }}>
          {icons[i]}
          <span style={{ fontSize: 10, fontWeight: active === i ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{ background: color + "20", color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12 }}>{label}</span>
);

const Button = ({ children, primary, full, small, disabled }) => (
  <div style={{
    background: disabled ? COLORS.border : primary ? COLORS.primary : "transparent",
    color: disabled ? COLORS.textMuted : primary ? "#fff" : COLORS.primary,
    border: primary ? "none" : `1.5px solid ${COLORS.primary}`,
    borderRadius: 12, padding: small ? "8px 16px" : "14px 24px",
    textAlign: "center", fontWeight: 600, fontSize: small ? 13 : 15,
    width: full ? "100%" : "auto", cursor: disabled ? "default" : "pointer"
  }}>{children}</div>
);

const Input = ({ label, placeholder, type }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: 500 }}>{label}</div>
    <div style={{
      height: type === "area" ? 80 : 44, background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center",
      color: COLORS.textMuted, fontSize: 14
    }}>{placeholder}</div>
  </div>
);

const AppLogo = ({ size = 72 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.25, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
    <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 48 48" fill="none">
      <path d="M14 14l7-7 7 7" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 7v22" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round"/>
      <path d="M12 36h24" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M28 22l6 6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M30 18l4 2" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>
);

const SplashScreen = () => (
  <div style={{ height: 812, background: `linear-gradient(160deg, ${COLORS.primaryDark} 0%, ${COLORS.primary} 40%, ${COLORS.primaryLight} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
    <StatusBar light />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 120, height: 120, borderRadius: 28, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="70" height="70" viewBox="0 0 48 48" fill="none">
          <path d="M14 14l7-7 7 7" stroke="#C9A84C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 7v24" stroke="#C9A84C" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M10 38h28" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
          <path d="M30 24l6 6" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M32 19l4 2" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>SubastApp</div>
        <div style={{ fontSize: 14, color: COLORS.accentLight, marginTop: 4, letterSpacing: 3, textTransform: "uppercase" }}>Subastas en vivo</div>
      </div>
    </div>
    <div style={{ marginBottom: 60, display: "flex", gap: 6 }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i===1 ? "#fff" : "rgba(255,255,255,0.3)" }} />)}
    </div>
  </div>
);

const LoginScreen = () => (
  <div style={{ height: 812, background: COLORS.bg }}>
    <StatusBar />
    <div style={{ padding: "40px 24px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-block" }}><AppLogo size={72} /></div>
        <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, marginTop: 16 }}>Bienvenido</div>
        <div style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }}>Ingresá a tu cuenta para continuar</div>
      </div>
      <Input label="Email" placeholder="tu@email.com" />
      <Input label="Contraseña" placeholder="••••••••" />
      <div style={{ textAlign: "right", marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 500 }}>¿Olvidaste tu contraseña?</span>
      </div>
      <Button primary full>Iniciar sesión</Button>
      <div style={{ textAlign: "center", margin: "20px 0", color: COLORS.textMuted, fontSize: 13 }}>o continuar con</div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, height: 48, border: `1px solid ${COLORS.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.card }}>
          <span style={{ fontSize: 20 }}>G</span>
        </div>
        <div style={{ flex: 1, height: 48, border: `1px solid ${COLORS.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.card }}>
          <span style={{ fontSize: 20 }}>A</span>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 32, fontSize: 14 }}>
        <span style={{ color: COLORS.textSecondary }}>¿No tenés cuenta? </span>
        <span style={{ color: COLORS.primary, fontWeight: 600 }}>Registrate</span>
      </div>
    </div>
  </div>
);

const Registro1Screen = () => (
  <div style={{ height: 812, background: COLORS.bg }}>
    <StatusBar />
    <NavBar title="Registro" back />
    <div style={{ padding: "8px 24px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: COLORS.primary }} />
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: COLORS.border }} />
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: COLORS.border }} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Datos personales</div>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 }}>Completá tu información para verificación</div>
      <Input label="Nombre" placeholder="Juan" />
      <Input label="Apellido" placeholder="Pérez" />
      <Input label="País de origen" placeholder="Argentina" />
      <Input label="Domicilio legal" placeholder="Av. Corrientes 1234, CABA" />
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontWeight: 500 }}>Documento (frente y dorso)</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {["Frente", "Dorso"].map(s => (
          <div key={s} style={{ flex: 1, height: 90, border: `2px dashed ${COLORS.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 16V8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" stroke={COLORS.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{s}</span>
          </div>
        ))}
      </div>
      <Button primary full>Continuar</Button>
    </div>
  </div>
);

const Registro2Screen = () => (
  <div style={{ height: 812, background: COLORS.bg }}>
    <StatusBar />
    <NavBar title="Registro" back />
    <div style={{ padding: "8px 24px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: COLORS.primary }} />
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: COLORS.primary }} />
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: COLORS.border }} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Crear credenciales</div>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 }}>Generá tu clave personal y registrá un medio de pago</div>
      <Input label="Email verificado" placeholder="juan@email.com" />
      <Input label="Clave personal" placeholder="••••••••" />
      <Input label="Confirmar clave" placeholder="••••••••" />
      <div style={{ height: 1, background: COLORS.border, margin: "8px 0 20px" }} />
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Medio de pago</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Cuenta bancaria", desc: "Nacional o extranjera" },
          { label: "Tarjeta de crédito", desc: "Visa, MasterCard, Amex" },
          { label: "Cheque certificado", desc: "Monto determinado" },
        ].map((m, i) => (
          <div key={i} style={{ padding: "14px 16px", background: COLORS.card, border: `1px solid ${i === 0 ? COLORS.primary : COLORS.border}`, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{m.desc}</div>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${i === 0 ? COLORS.primary : COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {i === 0 && <div style={{ width: 10, height: 10, borderRadius: 5, background: COLORS.primary }} />}
            </div>
          </div>
        ))}
      </div>
      <Button primary full>Completar registro</Button>
    </div>
  </div>
);

const HomeScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 80, position: "relative" }}>
    <div style={{ background: COLORS.primary, borderRadius: "0 0 24px 24px", padding: "0 24px 24px" }}>
      <StatusBar light />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Hola, Juan</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Subastas</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: COLORS.primaryDark }}>JP</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {["Todas", "Hoy", "Próximas", "Mis pujas"].map((f, i) => (
          <div key={i} style={{ padding: "6px 14px", borderRadius: 20, background: i === 0 ? "#fff" : "rgba(255,255,255,0.15)", color: i === 0 ? COLORS.primary : "#fff", fontSize: 13, fontWeight: 500 }}>{f}</div>
        ))}
      </div>
    </div>
    <div style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>En vivo ahora</div>
      <div style={{ background: COLORS.card, borderRadius: 16, overflow: "hidden", border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
        <div style={{ height: 140, background: `linear-gradient(135deg, ${COLORS.primaryDark}, ${COLORS.primaryLight})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "absolute", top: 12, left: 12 }}><Badge label="EN VIVO" color={COLORS.danger} /></div>
          <div style={{ position: "absolute", top: 12, right: 12 }}><Badge label="ORO" color={COLORS.categorias.oro} /></div>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none"><path d="M4 16l4-8 3 6 5-10 4 8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Colección Primavera 2026</div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>Martillero: Carlos Méndez</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>Oferta actual</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.accent }}>USD 45.200</div>
            </div>
            <div style={{ padding: "10px 20px", background: COLORS.primary, borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 14 }}>Ingresar</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Próximas subastas</div>
      {[
        { title: "Arte Contemporáneo", date: "15 Abr · 18:00", cat: "Platino", catColor: COLORS.categorias.platino, moneda: "USD" },
        { title: "Joyería Antigua", date: "17 Abr · 14:00", cat: "Plata", catColor: COLORS.categorias.plata, moneda: "ARS" },
        { title: "Mobiliario Diseñador", date: "20 Abr · 16:00", cat: "Común", catColor: COLORS.categorias.comun, moneda: "ARS" },
      ].map((s, i) => (
        <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: 14, border: `1px solid ${COLORS.border}`, marginBottom: 10, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: COLORS.borderLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 16l4-8 3 6 5-10 4 8" stroke={COLORS.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{s.date} · {s.moneda}</div>
          </div>
          <Badge label={s.cat} color={s.catColor} />
        </div>
      ))}
    </div>
    <BottomNav active={0} />
  </div>
);

const CatalogoScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 80 }}>
    <StatusBar />
    <NavBar title="Catálogo - Colección Primavera" back />
    <div style={{ padding: "8px 24px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 40, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke={COLORS.textMuted} strokeWidth="1.5" /><path d="M21 21l-4.35-4.35" stroke={COLORS.textMuted} strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>Buscar pieza...</span>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.card }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 4h18M3 12h12M3 20h6" stroke={COLORS.textSecondary} strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
      </div>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 }}>12 piezas · Subasta 15 Abr 18:00 · USD</div>
      {[
        { num: "001", name: "Óleo sobre lienzo - Amanecer", artist: "M. López, 1985", base: "USD 12.000" },
        { num: "002", name: "Escultura bronce - Danza", artist: "R. Torres, 1972", base: "USD 8.500" },
        { num: "003", name: "Juego de té porcelana (18 pzas)", artist: "Sèvres, s.XIX", base: "USD 5.200" },
        { num: "004", name: "Acuarela - Puerto al atardecer", artist: "A. Berni, 1960", base: "USD 22.000" },
      ].map((p, i) => (
        <div key={i} style={{ background: COLORS.card, borderRadius: 14, marginBottom: 10, border: `1px solid ${COLORS.border}`, overflow: "hidden", display: "flex" }}>
          <div style={{ width: 100, minHeight: 100, background: COLORS.borderLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={COLORS.textMuted} strokeWidth="1.2" /><circle cx="8.5" cy="8.5" r="1.5" fill={COLORS.textMuted} /><path d="M21 15l-5-5-9 9" stroke={COLORS.textMuted} strokeWidth="1.2" /></svg>
          </div>
          <div style={{ padding: 14, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: COLORS.primary, fontWeight: 600 }}>Pieza #{p.num}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{p.artist}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.accent, marginTop: 6 }}>{p.base}</div>
          </div>
        </div>
      ))}
    </div>
    <BottomNav active={1} />
  </div>
);

const DetallePiezaScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 24 }}>
    <StatusBar />
    <div style={{ height: 280, background: `linear-gradient(135deg, #2C3E50, #4A6FA5)`, position: "relative" }}>
      <div style={{ position: "absolute", top: 50, left: 16 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
        {[0,1,2,3,4,5].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === 0 ? "#fff" : "rgba(255,255,255,0.4)" }} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" /><circle cx="8.5" cy="8.5" r="1.5" fill="rgba(255,255,255,0.4)" /><path d="M21 15l-5-5-9 9" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" /></svg>
      </div>
    </div>
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <Badge label="Pieza #001" color={COLORS.primary} />
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Óleo sobre lienzo - Amanecer</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, background: COLORS.card, borderRadius: 12, padding: 12, border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>Precio base</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.accent }}>USD 12.000</div>
        </div>
        <div style={{ flex: 1, background: COLORS.card, borderRadius: 12, padding: 12, border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>Puja mín.</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>USD 12.120</div>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Artista</div>
      <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 }}>Miguel López (Buenos Aires, 1945-2010). Reconocido exponente del arte figurativo argentino.</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Historia</div>
      <div style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 16 }}>Pintado en 1985 durante la residencia del artista en la Patagonia. Exhibido en el MNBA en 1987. Colección privada familia Rodríguez desde 1990.</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Descripción</div>
      <div style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 20 }}>Óleo sobre lienzo, 120x80cm. Marco original de época. Estado de conservación: excelente. Certificado de autenticidad incluido.</div>
      <Button primary full>Ver en subasta en vivo</Button>
    </div>
  </div>
);

const SubastaVivoScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 24 }}>
    <div style={{ background: COLORS.primaryDark, padding: "0 0 16px" }}>
      <StatusBar light />
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>Subasta en vivo</span>
          </div>
          <Badge label="EN VIVO" color="#ff4444" />
        </div>
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Pieza actual #003</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginTop: 2 }}>Juego de té porcelana (18 pzas)</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Sèvres, siglo XIX · Base: USD 5.200</div>
        </div>
      </div>
    </div>
    <div style={{ padding: "16px 16px 0" }}>
      <div style={{ background: COLORS.card, borderRadius: 16, padding: 16, border: `1px solid ${COLORS.border}`, textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}>Mejor oferta actual</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.accent, marginTop: 4 }}>USD 7.850</div>
        <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>por usuario ****1234 · hace 12s</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
          <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Mín.</span><div style={{ fontSize: 14, fontWeight: 600, color: COLORS.success }}>USD 7.902</div></div>
          <div style={{ width: 1, background: COLORS.border }} />
          <div><span style={{ fontSize: 11, color: COLORS.textMuted }}>Máx.</span><div style={{ fontSize: 14, fontWeight: 600, color: COLORS.danger }}>USD 8.890</div></div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>Tu oferta</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 52, background: COLORS.card, border: `2px solid ${COLORS.primary}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: COLORS.primary }}>USD 8.000</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["+100", "+250", "+500", "Máx"].map((v, i) => (
          <div key={i} style={{ flex: 1, height: 36, background: i === 3 ? COLORS.accent + "20" : COLORS.card, border: `1px solid ${i === 3 ? COLORS.accent : COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: i === 3 ? COLORS.accentDark : COLORS.textSecondary }}>{v}</div>
        ))}
      </div>
      <Button primary full>Pujar USD 8.000</Button>
      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>Historial de pujas</div>
      {[
        { user: "****1234", amount: "7.850", time: "14:23:45", you: false },
        { user: "Tú", amount: "7.500", time: "14:23:12", you: true },
        { user: "****5678", amount: "7.200", time: "14:22:58", you: false },
        { user: "****1234", amount: "6.800", time: "14:22:30", you: false },
        { user: "Tú", amount: "6.500", time: "14:22:01", you: true },
      ].map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: p.you ? COLORS.primary + "20" : COLORS.borderLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: p.you ? COLORS.primary : COLORS.textMuted }}>{p.you ? "TÚ" : "U"}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: p.you ? 600 : 400, color: p.you ? COLORS.primary : COLORS.text }}>{p.user}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{p.time}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? COLORS.accent : COLORS.text }}>USD {p.amount}</div>
        </div>
      ))}
    </div>
  </div>
);

const FacturaScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 24 }}>
    <StatusBar />
    <NavBar title="Factura de compra" back />
    <div style={{ padding: "8px 24px" }}>
      <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>Factura N°</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>SA-2026-00847</div>
          </div>
          <Badge label="Pagado" color={COLORS.success} />
        </div>
        <div style={{ height: 1, background: COLORS.border, margin: "0 0 16px" }} />
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Fecha de compra</div>
        <div style={{ fontSize: 14, marginBottom: 12 }}>10 de Marzo, 2026 · 14:23 hs</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Subasta</div>
        <div style={{ fontSize: 14, marginBottom: 12 }}>Colección Primavera 2026 — Categoría Oro</div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Pieza adquirida</div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, background: COLORS.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={COLORS.textMuted} strokeWidth="1.2" /><circle cx="8.5" cy="8.5" r="1.5" fill={COLORS.textMuted} /><path d="M21 15l-5-5-9 9" stroke={COLORS.textMuted} strokeWidth="1.2" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Óleo sobre lienzo — Amanecer</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>Pieza #001 · M. López, 1985</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>Óleo 120x80cm, marco original</div>
          </div>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Detalle de importes</div>
        {[
          { label: "Monto pujado", value: "USD 15.200,00" },
          { label: "Comisión de subasta (12%)", value: "USD 1.824,00" },
          { label: "Costo de envío", value: "USD 350,00" },
          { label: "Seguro de transporte", value: "USD 120,00" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? `1px solid ${COLORS.borderLight}` : "none" }}>
            <span style={{ fontSize: 14, color: COLORS.textSecondary }}>{item.label}</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", marginTop: 8, borderTop: `2px solid ${COLORS.text}` }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Total</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.accent }}>USD 17.494,00</span>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Medio de pago</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.primary + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: COLORS.primary }}>V</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Visa ****8790</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>Vto 08/28 · Internacional</div>
          </div>
        </div>
      </div>

      <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Envío</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 17h14M5 17a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2M5 17l-1 4h16l-1-4" stroke={COLORS.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Envío a domicilio</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>Av. Corrientes 1234, CABA, Argentina</div>
          </div>
        </div>
        <div style={{ background: `${COLORS.success}15`, borderRadius: 10, padding: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" stroke={COLORS.success} strokeWidth="1.5"/><path d="M8 12l3 3 5-5" stroke={COLORS.success} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 500 }}>Cubierto por seguro de transporte</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Button full>Descargar PDF</Button></div>
        <div style={{ flex: 1 }}><Button primary full>Seguir envío</Button></div>
      </div>
    </div>
  </div>
);

const PerfilScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 80 }}>
    <StatusBar />
    <div style={{ padding: "16px 24px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 40, background: COLORS.primary, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff" }}>JP</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>Juan Pérez</div>
      <div style={{ fontSize: 13, color: COLORS.textSecondary }}>juan@email.com</div>
      <div style={{ marginTop: 8 }}><Badge label="Categoría: Oro" color={COLORS.categorias.oro} /></div>
    </div>
    <div style={{ display: "flex", gap: 10, padding: "0 24px", marginBottom: 20 }}>
      {[
        { n: "24", l: "Subastas" },
        { n: "8", l: "Ganadas" },
        { n: "USD 125K", l: "Invertido" },
      ].map((s, i) => (
        <div key={i} style={{ flex: 1, background: COLORS.card, borderRadius: 12, padding: 12, border: `1px solid ${COLORS.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>{s.n}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{s.l}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: "0 24px" }}>
      {[
        "Mis datos personales",
        "Medios de pago",
        "Mis artículos en subasta",
        "Historial de compras",
        "Pólizas de seguro",
        "Ubicación de mis piezas",
        "Notificaciones",
        "Configuración",
        "Cerrar sesión",
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${COLORS.borderLight}`, color: i === 8 ? COLORS.danger : COLORS.text, fontSize: 15 }}>
          <span>{item}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke={i === 8 ? COLORS.danger : COLORS.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      ))}
    </div>
    <BottomNav active={4} />
  </div>
);

const MisSubastasScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 80 }}>
    <StatusBar />
    <NavBar title="Mis subastas" back />
    <div style={{ padding: "0 24px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["Todas", "Ganadas", "Activas", "Perdidas"].map((f, i) => (
          <div key={i} style={{ padding: "6px 14px", borderRadius: 20, background: i === 0 ? COLORS.primary : COLORS.card, color: i === 0 ? "#fff" : COLORS.textSecondary, fontSize: 13, fontWeight: 500, border: `1px solid ${i === 0 ? COLORS.primary : COLORS.border}` }}>{f}</div>
        ))}
      </div>
      {[
        { title: "Óleo - Amanecer", result: "Ganada", amount: "USD 15.200", date: "10 Mar 2026", color: COLORS.success },
        { title: "Reloj Patek Philippe", result: "Perdida", amount: "USD 89.000", date: "05 Mar 2026", color: COLORS.danger },
        { title: "Escultura bronce", result: "Ganada", amount: "USD 12.400", date: "28 Feb 2026", color: COLORS.success },
        { title: "Set sillas Luis XV (4)", result: "Activa", amount: "USD 3.800", date: "Hoy 18:00", color: COLORS.warning },
      ].map((s, i) => (
        <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: 14, border: `1px solid ${COLORS.border}`, marginBottom: 10, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.borderLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={COLORS.textMuted} strokeWidth="1.2" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{s.date}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{s.amount}</div>
            <Badge label={s.result} color={s.color} />
          </div>
        </div>
      ))}
    </div>
    <BottomNav active={1} />
  </div>
);

const MediosPagoScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 80 }}>
    <StatusBar />
    <NavBar title="Medios de pago" back />
    <div style={{ padding: "0 24px" }}>
      {[
        { type: "Cuenta bancaria", detail: "Banco Galicia · ****4521", status: "Verificado", icon: "B" },
        { type: "Tarjeta de crédito", detail: "Visa ****8790 · Vto 08/28", status: "Verificado", icon: "V" },
        { type: "Cheque certificado", detail: "USD 50.000 · Banco Nación", status: "Pendiente", icon: "C" },
      ].map((m, i) => (
        <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 10, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: COLORS.primary + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: COLORS.primary }}>{m.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{m.type}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{m.detail}</div>
          </div>
          <Badge label={m.status} color={m.status === "Verificado" ? COLORS.success : COLORS.warning} />
        </div>
      ))}
      <div style={{ marginTop: 16 }}><Button primary full>Agregar medio de pago</Button></div>
    </div>
    <BottomNav active={4} />
  </div>
);

const AgregarPagoScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg }}>
    <StatusBar />
    <NavBar title="Agregar medio de pago" back />
    <div style={{ padding: "8px 24px" }}>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 }}>Seleccioná el tipo de medio de pago</div>
      {[
        { label: "Cuenta bancaria", desc: "Nacional o extranjera", selected: true },
        { label: "Tarjeta de crédito", desc: "Nacional o internacional" },
        { label: "Cheque certificado", desc: "Con monto determinado" },
      ].map((m, i) => (
        <div key={i} style={{ padding: "14px 16px", background: COLORS.card, border: `1px solid ${m.selected ? COLORS.primary : COLORS.border}`, borderRadius: 12, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 14, fontWeight: 500 }}>{m.label}</div><div style={{ fontSize: 12, color: COLORS.textMuted }}>{m.desc}</div></div>
          <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${m.selected ? COLORS.primary : COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {m.selected && <div style={{ width: 10, height: 10, borderRadius: 5, background: COLORS.primary }} />}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <Input label="Banco" placeholder="Ej: Banco Galicia" />
        <Input label="País del banco" placeholder="Argentina" />
        <Input label="Tipo de cuenta" placeholder="Caja de ahorro en USD" />
        <Input label="CBU / IBAN" placeholder="0000000000000000000000" />
        <Input label="Moneda de la cuenta" placeholder="USD" />
      </div>
      <div style={{ marginTop: 8 }}><Button primary full>Registrar medio de pago</Button></div>
    </div>
  </div>
);

const SolicitarSubastaScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 24 }}>
    <StatusBar />
    <NavBar title="Solicitar subasta" back />
    <div style={{ padding: "8px 24px" }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Incluir artículo en subasta</div>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 }}>Completá los datos del bien que deseás subastar</div>
      <Input label="Nombre del artículo" placeholder="Ej: Óleo sobre lienzo" />
      <Input label="Descripción" placeholder="Describí el artículo en detalle..." type="area" />
      <Input label="Artista / Diseñador (opcional)" placeholder="Nombre del creador" />
      <Input label="Fecha / Época" placeholder="Ej: 1985, Siglo XIX" />
      <Input label="Historia del objeto (opcional)" placeholder="Contexto, dueños anteriores, curiosidades..." type="area" />
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontWeight: 500 }}>Fotografías (mínimo 6)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ aspectRatio: "1", border: `2px dashed ${COLORS.border}`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: COLORS.card }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke={COLORS.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>Foto {i + 1}</span>
          </div>
        ))}
      </div>
      <Input label="Cuenta destino para cobro" placeholder="CBU / IBAN de la cuenta" />
      <div style={{ background: COLORS.card, borderRadius: 12, padding: 14, border: `1px solid ${COLORS.border}`, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 22, height: 22, borderRadius: 4, border: `2px solid ${COLORS.primary}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={COLORS.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4 }}>Declaro que el bien a subastar me pertenece legalmente, no posee ningún impedimento para su venta, y su origen es lícito. Acepto que en caso de rechazo, la devolución será con cargo a mi persona.</div>
      </div>
      <Button primary full>Enviar solicitud</Button>
    </div>
  </div>
);

const MetricasScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 80 }}>
    <StatusBar />
    <NavBar title="Métricas" />
    <div style={{ padding: "0 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Subastas", value: "24", sub: "+3 este mes" },
          { label: "Ganadas", value: "8", sub: "33% éxito" },
          { label: "Total invertido", value: "$125K", sub: "USD" },
          { label: "Total ofertado", value: "$340K", sub: "USD" },
        ].map((m, i) => (
          <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: 14, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primary }}>{m.value}</div>
            <div style={{ fontSize: 11, color: COLORS.success }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Por categoría</div>
      {[
        { cat: "Oro", count: 12, color: COLORS.categorias.oro, pct: 50 },
        { cat: "Plata", count: 7, color: COLORS.categorias.plata, pct: 29 },
        { cat: "Especial", count: 3, color: COLORS.categorias.especial, pct: 13 },
        { cat: "Común", count: 2, color: COLORS.categorias.comun, pct: 8 },
      ].map((c, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 500 }}>{c.cat}</span>
            <span style={{ color: COLORS.textMuted }}>{c.count} subastas · {c.pct}%</span>
          </div>
          <div style={{ height: 8, background: COLORS.borderLight, borderRadius: 4 }}>
            <div style={{ width: `${c.pct}%`, height: "100%", background: c.color, borderRadius: 4 }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 20, marginBottom: 10 }}>Últimas actividades</div>
      {[
        { text: "Ganaste subasta Colección Otoño", time: "Hace 2 días", type: "win" },
        { text: "Puja superada en Joyería Antigua", time: "Hace 5 días", type: "lose" },
        { text: "Tu artículo fue aceptado", time: "Hace 1 semana", type: "info" },
      ].map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: a.type === "win" ? COLORS.success + "20" : a.type === "lose" ? COLORS.danger + "20" : COLORS.primary + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14 }}>{a.type === "win" ? "✓" : a.type === "lose" ? "×" : "i"}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{a.text}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{a.time}</div>
          </div>
        </div>
      ))}
    </div>
    <BottomNav active={3} />
  </div>
);

const PaletaScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 24 }}>
    <StatusBar />
    <NavBar title="Paleta de colores" />
    <div style={{ padding: "8px 24px" }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Colores principales</div>
      {[
        { name: "Primary Dark", hex: "#0F3460", color: COLORS.primaryDark },
        { name: "Primary", hex: "#1D4E89", color: COLORS.primary },
        { name: "Primary Light", hex: "#2A6CB5", color: COLORS.primaryLight },
        { name: "Accent Gold", hex: "#C9A84C", color: COLORS.accent },
        { name: "Accent Light", hex: "#E8D5A0", color: COLORS.accentLight },
      ].map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color, border: `1px solid ${COLORS.border}` }} />
          <div><div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{c.hex}</div></div>
        </div>
      ))}
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 20, marginBottom: 16 }}>Semánticos</div>
      {[
        { name: "Success", hex: "#1D9E75", color: COLORS.success },
        { name: "Danger", hex: "#E24B4A", color: COLORS.danger },
        { name: "Warning", hex: "#EF9F27", color: COLORS.warning },
      ].map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color }} />
          <div><div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{c.hex}</div></div>
        </div>
      ))}
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 20, marginBottom: 16 }}>Categorías</div>
      {[
        { name: "Común", hex: "#888780", color: COLORS.categorias.comun },
        { name: "Especial", hex: "#378ADD", color: COLORS.categorias.especial },
        { name: "Plata", hex: "#B4B2A9", color: COLORS.categorias.plata },
        { name: "Oro", hex: "#EF9F27", color: COLORS.categorias.oro },
        { name: "Platino", hex: "#7F77DD", color: COLORS.categorias.platino },
      ].map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color }} />
          <div><div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{c.hex}</div></div>
        </div>
      ))}
      <div style={{ fontSize: 16, fontWeight: 600, marginTop: 20, marginBottom: 16 }}>Neutros</div>
      {[
        { name: "Background", hex: "#F8F7F4", color: COLORS.bg },
        { name: "Card", hex: "#FFFFFF", color: COLORS.card },
        { name: "Border", hex: "#E5E3DD", color: COLORS.border },
        { name: "Text", hex: "#1A1A1A", color: COLORS.text },
        { name: "Text Secondary", hex: "#6B6B6B", color: COLORS.textSecondary },
        { name: "Text Muted", hex: "#9A9A9A", color: COLORS.textMuted },
      ].map((c, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color, border: `1px solid ${COLORS.border}` }} />
          <div><div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{c.hex}</div></div>
        </div>
      ))}
    </div>
  </div>
);

const NavegacionScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 24, overflow: "auto" }}>
    <StatusBar />
    <NavBar title="Mapa de navegación" />
    <div style={{ padding: "8px 16px" }}>
      <svg viewBox="0 0 340 900" width="100%" style={{ fontFamily: "system-ui" }}>
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.primary} /></marker>
        </defs>
        {/* Splash */}
        <rect x="120" y="10" width="100" height="36" rx="8" fill={COLORS.primary} />
        <text x="170" y="33" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="600">Splash</text>
        <line x1="170" y1="46" x2="170" y2="70" stroke={COLORS.primary} strokeWidth="1.5" markerEnd="url(#arr)" />
        {/* Login */}
        <rect x="120" y="70" width="100" height="36" rx="8" fill={COLORS.primary} />
        <text x="170" y="93" fill="#fff" textAnchor="middle" fontSize="11" fontWeight="600">Login</text>
        <line x1="170" y1="106" x2="170" y2="130" stroke={COLORS.primary} strokeWidth="1.5" markerEnd="url(#arr)" />
        {/* Registro fork */}
        <line x1="120" y1="88" x2="40" y2="88" stroke={COLORS.primary} strokeWidth="1" />
        <line x1="40" y1="88" x2="40" y2="140" stroke={COLORS.primary} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="-10" y="140" width="100" height="36" rx="8" fill={COLORS.accent} />
        <text x="40" y="163" fill={COLORS.primaryDark} textAnchor="middle" fontSize="10" fontWeight="600">Registro P1</text>
        <line x1="40" y1="176" x2="40" y2="200" stroke={COLORS.accent} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="-10" y="200" width="100" height="36" rx="8" fill={COLORS.accent} />
        <text x="40" y="223" fill={COLORS.primaryDark} textAnchor="middle" fontSize="10" fontWeight="600">Registro P2</text>
        <line x1="90" y1="218" x2="120" y2="200" stroke={COLORS.accent} strokeWidth="1" markerEnd="url(#arr)" strokeDasharray="4" />
        {/* Home */}
        <rect x="110" y="130" width="120" height="40" rx="10" fill={COLORS.primary} stroke={COLORS.accent} strokeWidth="2" />
        <text x="170" y="155" fill="#fff" textAnchor="middle" fontSize="12" fontWeight="700">HOME</text>
        {/* Branches */}
        <line x1="130" y1="170" x2="60" y2="220" stroke={COLORS.primary} strokeWidth="1.2" markerEnd="url(#arr)" />
        <line x1="150" y1="170" x2="120" y2="220" stroke={COLORS.primary} strokeWidth="1.2" markerEnd="url(#arr)" />
        <line x1="170" y1="170" x2="170" y2="220" stroke={COLORS.primary} strokeWidth="1.2" markerEnd="url(#arr)" />
        <line x1="190" y1="170" x2="220" y2="220" stroke={COLORS.primary} strokeWidth="1.2" markerEnd="url(#arr)" />
        <line x1="210" y1="170" x2="290" y2="220" stroke={COLORS.primary} strokeWidth="1.2" markerEnd="url(#arr)" />
        {/* 5 nav items */}
        <rect x="10" y="220" width="90" height="32" rx="7" fill={COLORS.card} stroke={COLORS.border} />
        <text x="55" y="241" fill={COLORS.text} textAnchor="middle" fontSize="10">Subastas</text>
        <rect x="80" y="270" width="90" height="32" rx="7" fill={COLORS.card} stroke={COLORS.border} />
        <text x="125" y="291" fill={COLORS.text} textAnchor="middle" fontSize="10">Vender</text>
        <rect x="130" y="220" width="80" height="32" rx="7" fill={COLORS.card} stroke={COLORS.border} />
        <text x="170" y="241" fill={COLORS.text} textAnchor="middle" fontSize="10">Métricas</text>
        <rect x="180" y="270" width="80" height="32" rx="7" fill={COLORS.card} stroke={COLORS.border} />
        <text x="220" y="291" fill={COLORS.text} textAnchor="middle" fontSize="10">Perfil</text>
        <rect x="250" y="220" width="80" height="32" rx="7" fill={COLORS.card} stroke={COLORS.border} />
        <text x="290" y="241" fill={COLORS.text} textAnchor="middle" fontSize="10">Catálogo</text>
        {/* Sub-screens */}
        <line x1="55" y1="252" x2="55" y2="330" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="5" y="330" width="100" height="30" rx="6" fill={COLORS.primaryLight+"30"} stroke={COLORS.primaryLight} strokeWidth="0.5" />
        <text x="55" y="349" fill={COLORS.primaryDark} textAnchor="middle" fontSize="9">Subasta en vivo</text>
        <line x1="55" y1="360" x2="55" y2="390" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="5" y="390" width="100" height="30" rx="6" fill={COLORS.success+"20"} stroke={COLORS.success} strokeWidth="0.5" />
        <text x="55" y="409" fill="#085041" textAnchor="middle" fontSize="9">Pujar</text>
        <line x1="55" y1="420" x2="55" y2="450" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="5" y="450" width="100" height="30" rx="6" fill={COLORS.accent+"20"} stroke={COLORS.accent} strokeWidth="0.5" />
        <text x="55" y="469" fill={COLORS.accentDark} textAnchor="middle" fontSize="9">Resultado puja</text>

        <line x1="125" y1="302" x2="125" y2="330" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="75" y="330" width="100" height="30" rx="6" fill={COLORS.accent+"20"} stroke={COLORS.accent} strokeWidth="0.5" />
        <text x="125" y="349" fill={COLORS.accentDark} textAnchor="middle" fontSize="9">Form. solicitud</text>

        <line x1="290" y1="252" x2="290" y2="330" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="240" y="330" width="100" height="30" rx="6" fill={COLORS.primaryLight+"30"} stroke={COLORS.primaryLight} strokeWidth="0.5" />
        <text x="290" y="349" fill={COLORS.primaryDark} textAnchor="middle" fontSize="9">Detalle pieza</text>

        <line x1="220" y1="302" x2="220" y2="380" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="170" y="380" width="100" height="30" rx="6" fill={COLORS.card} stroke={COLORS.border} />
        <text x="220" y="399" fill={COLORS.text} textAnchor="middle" fontSize="9">Medios de pago</text>
        <line x1="220" y1="410" x2="220" y2="440" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="170" y="440" width="100" height="30" rx="6" fill={COLORS.card} stroke={COLORS.border} />
        <text x="220" y="459" fill={COLORS.text} textAnchor="middle" fontSize="9">Agregar pago</text>

        <line x1="220" y1="302" x2="300" y2="380" stroke={COLORS.textMuted} strokeWidth="1" markerEnd="url(#arr)" />
        <rect x="250" y="380" width="90" height="30" rx="6" fill={COLORS.card} stroke={COLORS.border} />
        <text x="295" y="399" fill={COLORS.text} textAnchor="middle" fontSize="9">Mis subastas</text>

        {/* Leyenda */}
        <rect x="10" y="520" width="320" height="90" rx="8" fill={COLORS.card} stroke={COLORS.border} />
        <text x="170" y="540" fill={COLORS.text} textAnchor="middle" fontSize="11" fontWeight="600">Leyenda</text>
        <rect x="20" y="550" width="12" height="12" rx="3" fill={COLORS.primary} />
        <text x="38" y="560" fill={COLORS.text} fontSize="9">Pantalla principal</text>
        <rect x="20" y="568" width="12" height="12" rx="3" fill={COLORS.accent} />
        <text x="38" y="578" fill={COLORS.text} fontSize="9">Flujo de registro</text>
        <rect x="20" y="586" width="12" height="12" rx="3" fill={COLORS.card} stroke={COLORS.border} />
        <text x="38" y="596" fill={COLORS.text} fontSize="9">Pantalla secundaria</text>
        <rect x="170" y="550" width="12" height="12" rx="3" fill={COLORS.primaryLight+"30"} stroke={COLORS.primaryLight} />
        <text x="188" y="560" fill={COLORS.text} fontSize="9">Detalle / vista</text>
        <rect x="170" y="568" width="12" height="12" rx="3" fill={COLORS.success+"20"} stroke={COLORS.success} />
        <text x="188" y="578" fill={COLORS.text} fontSize="9">Acción principal</text>
        <rect x="170" y="586" width="12" height="12" rx="3" fill={COLORS.accent+"20"} stroke={COLORS.accent} />
        <text x="188" y="596" fill={COLORS.text} fontSize="9">Resultado</text>
      </svg>
    </div>
  </div>
);

const EndpointsScreen = () => (
  <div style={{ minHeight: 812, background: COLORS.bg, paddingBottom: 24, overflow: "auto" }}>
    <StatusBar />
    <NavBar title="API REST Endpoints" />
    <div style={{ padding: "8px 16px" }}>
      {[
        { method: "POST", path: "/auth/login", desc: "Autenticación", codes: "200, 401, 403" },
        { method: "POST", path: "/auth/register/step1", desc: "Registro datos personales", codes: "201, 400, 409" },
        { method: "POST", path: "/auth/register/step2", desc: "Crear credenciales", codes: "200, 400, 404" },
        { method: "GET", path: "/users/{id}/profile", desc: "Obtener perfil usuario", codes: "200, 401, 404" },
        { method: "PUT", path: "/users/{id}/profile", desc: "Actualizar perfil", codes: "200, 400, 401" },
        { method: "GET", path: "/users/{id}/metrics", desc: "Métricas del usuario", codes: "200, 401" },
        { method: "GET", path: "/subastas", desc: "Listar subastas", codes: "200, 401" },
        { method: "GET", path: "/subastas/{id}", desc: "Detalle subasta", codes: "200, 401, 403, 404" },
        { method: "GET", path: "/subastas/{id}/catalogo", desc: "Catálogo de subasta", codes: "200, 404" },
        { method: "GET", path: "/subastas/{id}/live", desc: "Stream en vivo (WS)", codes: "101, 401, 403" },
        { method: "POST", path: "/subastas/{id}/pujas", desc: "Realizar puja", codes: "201, 400, 403, 409" },
        { method: "GET", path: "/subastas/{id}/pujas", desc: "Historial de pujas", codes: "200, 401" },
        { method: "GET", path: "/piezas/{id}", desc: "Detalle de pieza", codes: "200, 404" },
        { method: "GET", path: "/piezas/{id}/ubicacion", desc: "Ubicación pieza", codes: "200, 401, 403" },
        { method: "GET", path: "/piezas/{id}/seguro", desc: "Póliza de seguro", codes: "200, 401, 403" },
        { method: "GET", path: "/pagos", desc: "Listar medios pago", codes: "200, 401" },
        { method: "POST", path: "/pagos", desc: "Registrar medio pago", codes: "201, 400, 401" },
        { method: "DELETE", path: "/pagos/{id}", desc: "Eliminar medio pago", codes: "200, 401, 404" },
        { method: "POST", path: "/venta/solicitud", desc: "Solicitar subasta artículo", codes: "201, 400, 401" },
        { method: "GET", path: "/venta/solicitudes", desc: "Mis solicitudes", codes: "200, 401" },
        { method: "GET", path: "/venta/solicitudes/{id}", desc: "Estado solicitud", codes: "200, 401, 404" },
        { method: "POST", path: "/compras/{id}/envio", desc: "Config. envío compra", codes: "200, 400, 401" },
        { method: "GET", path: "/compras/{id}/factura", desc: "Factura de compra", codes: "200, 401, 404" },
      ].map((e, i) => {
        const methodColors = { GET: COLORS.success, POST: COLORS.primary, PUT: COLORS.warning, DELETE: COLORS.danger };
        return (
          <div key={i} style={{ background: COLORS.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${COLORS.border}`, marginBottom: 6, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: methodColors[e.method], background: methodColors[e.method] + "15", padding: "3px 8px", borderRadius: 6, fontFamily: "monospace", minWidth: 48, textAlign: "center" }}>{e.method}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.path}</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted }}>{e.desc} · {e.codes}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const screenComponents = {
  splash: SplashScreen,
  login: LoginScreen,
  registro1: Registro1Screen,
  registro2: Registro2Screen,
  home: HomeScreen,
  catalogo: CatalogoScreen,
  detalle_pieza: DetallePiezaScreen,
  subasta_vivo: SubastaVivoScreen,
  factura: FacturaScreen,
  perfil: PerfilScreen,
  mis_subastas: MisSubastasScreen,
  medios_pago: MediosPagoScreen,
  agregar_pago: AgregarPagoScreen,
  solicitar_subasta: SolicitarSubastaScreen,
  metricas: MetricasScreen,
  paleta: PaletaScreen,
  navegacion: NavegacionScreen,
  endpoints: EndpointsScreen,
};

export default function App() {
  const [current, setCurrent] = useState("splash");
  const Screen = screenComponents[current];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#F0EEE8", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 12px", flexWrap: "wrap", background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        {screens.map(s => (
          <div key={s} onClick={() => setCurrent(s)} style={{
            padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: current === s ? 600 : 400,
            background: current === s ? COLORS.primary : "transparent", color: current === s ? "#fff" : COLORS.textSecondary,
            border: `1px solid ${current === s ? COLORS.primary : COLORS.border}`, whiteSpace: "nowrap"
          }}>{screenNames[s]}</div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", padding: "32px 16px" }}>
        <Phone><Screen /></Phone>
      </div>
    </div>
  );
}
