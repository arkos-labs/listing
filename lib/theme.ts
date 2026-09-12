/** Palette et constantes partagées pour l'habillage visuel de l'appli. */

export const lightColors = {
  // Fonds — Blanc cassé chaud (ivoire très léger)
  bg: '#FDFCF8',
  bgSubtle: '#F4F3ED',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  // Texte
  text: '#0E1621',
  textMuted: '#5C6470',
  textFaint: '#AAB2BC',
  // Bordures — plus chaudes pour matcher le fond
  border: '#EBE9E1',
  borderStrong: '#D6D3C9',
  black: '#0E1621',
  // Vert principal — plus sophistiqué
  green: '#166F42',
  greenLight: '#20935A',
  greenSoft: '#E8F5EE',
  greenDark: '#0F5230',
  // Hero card
  heroBg: '#0F4D2C',
  heroAccent: '#1A7043',
  heroText: '#FFFFFF',
  heroSub: 'rgba(255,255,255,0.6)',
  // Alertes
  amber: '#C87212',
  amberSoft: '#FEF3E2',
  red: '#D93025',
  redSoft: '#FDECEA',
  blue: '#1A6CB8',
  blueSoft: '#E8F1FB',
};

export const darkColors = {
  // Fonds — Pitch Black (OLED friendly)
  bg: '#000000',
  bgSubtle: '#09090B',
  card: '#121214',
  cardElevated: '#1C1C1F',
  // Texte — High contrast
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textFaint: '#52525B',
  // Bordures
  border: '#27272A',
  borderStrong: '#3F3F46',
  black: '#18181B',
  // Vert principal — vibrant pour contraster avec le noir
  green: '#22C55E',
  greenLight: '#4ADE80',
  greenSoft: '#052E16',
  greenDark: '#16A34A',
  // Hero card
  heroBg: '#022C22',
  heroAccent: '#064E3B',
  heroText: '#FFFFFF',
  heroSub: 'rgba(255,255,255,0.7)',
  // Alertes
  amber: '#F59E0B',
  amberSoft: '#451A03',
  red: '#EF4444',
  redSoft: '#450A0A',
  blue: '#3B82F6',
  blueSoft: '#172554',
};

export type AppColors = typeof lightColors;

export const colors = lightColors;

export const radius = {
  card: 20,
  cardLg: 24,
  input: 14,
  pill: 999,
  sm: 10,
};

export const shadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

export const shadowMd = {
  shadowColor: '#000000',
  shadowOpacity: 0.1,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
} as const;

export const heroShadow = {
  shadowColor: '#0F4D2C',
  shadowOpacity: 0.4,
  shadowRadius: 28,
  shadowOffset: { width: 0, height: 14 },
  elevation: 10,
} as const;
