/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Tokens de marca de SubastApp, portados desde el frontend web
 * (frontend/src/styles/colors.css y theme.css). Usar estos al construir
 * las pantallas desde cero para no hardcodear valores.
 */

/** Paleta de colores de la marca. */
export const Brand = {
  // Primarios — navegación, headers, botones primarios
  primaryDark: '#0f3460',
  primary: '#1d4e89',
  primaryLight: '#2a6cb5',

  // Acento — importes, pujas destacadas, valores ganadores
  accent: '#c9a84c',
  accentLight: '#e8d5a0',

  // Semánticos
  success: '#1d9e75', // puja aceptada / ganado / pago realizado
  danger: '#e24b4a', // error / perdido / bloqueado / multa
  warning: '#ef9f27', // pendiente / por verificar / próxima

  // Categorías de usuario
  catComun: '#888780',
  catEspecial: '#378add',
  catPlata: '#b4b2a9',
  catOro: '#ef9f27',
  catPlatino: '#7f77dd',

  // Neutros
  bg: '#e5e3dd', // fondo (token original de la guía)
  pageBg: '#f8f7f4', // fondo de pantalla usado en los diseños (Home - Subastas)
  surface: '#ffffff', // tarjetas, paneles
  border: '#d8d6cf',
  placeholder: '#d4d4d4',
  text: '#1a1a1a', // texto principal
  textMuted: '#6b6b6b',
  textOnPrimary: '#ffffff',
} as const;

/** Escala de espaciado (xs–xl) del web. */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Radios de borde. */
export const Radius = {
  sm: 8,
  md: 14, // tarjetas
  lg: 24, // header, paneles
  xl: 32, // ícono de app / splash
  pill: 999, // filtros tipo pill, badges
} as const;

/** Tamaños de fuente (px). */
export const FontSize = {
  xs: 12, // badges, etiquetas CATEGORIA
  sm: 14, // texto secundario
  base: 16, // cuerpo
  lg: 20, // títulos de sección
  xl: 28, // título de pantalla
} as const;

/** Pesos de fuente (como string, formato RN). */
export const FontWeight = {
  normal: '400',
  medium: '600',
  bold: '700',
} as const;

/** Sombras como objetos de estilo RN (incluye `elevation` para Android). */
export const Shadow = {
  card: {
    shadowColor: '#0f3460',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0f3460',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/** Stops del gradiente de marca (para usar con expo-linear-gradient). */
export const BrandGradient = ['#0f3460', '#1d4e89'] as const;
