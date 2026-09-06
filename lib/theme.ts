/** Palette et constantes partagées pour l'habillage visuel de l'appli. */

export const lightColors = {
  // Fonds
  bg: '#F5F6F8',
  bgSubtle: '#ECEEF2',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  // Texte
  text: '#0E1621',
  textMuted: '#5C6470',
  textFaint: '#AAB2BC',
  // Bordures
  border: '#E8EAEE',
  borderStrong: '#D4D8DE',
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
  // Fonds
  bg: '#0A0E14',
  bgSubtle: '#111620',
  card: '#141A24',
  cardElevated: '#1A2130',
  // Texte
  text: '#E2E8F0',
  textMuted: '#7A8899',
  textFaint: '#3E4A58',
  // Bordures
  border: '#1E2A38',
  borderStrong: '#263040',
  black: '#1E2A38',
  // Vert principal
  green: '#27A85A',
  greenLight: '#33C06A',
  greenSoft: '#0A2418',
  greenDark: '#5ED487',
  // Hero card
  heroBg: '#0A2E1A',
  heroAccent: '#134024',
  heroText: '#FFFFFF',
  heroSub: 'rgba(255,255,255,0.5)',
  // Alertes
  amber: '#F0A030',
  amberSoft: '#2A1A04',
  red: '#F26560',
  redSoft: '#2A0A09',
  blue: '#4A9DE8',
  blueSoft: '#0A1E30',
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
