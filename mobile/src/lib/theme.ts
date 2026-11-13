/** Charte Moon, d'après les maquettes. */
export const colors = {
  night: '#2B1858', // violet nuit (en-têtes)
  nightSoft: '#3D2A75',
  purple: '#5B3FA8', // boutons principaux
  lavender: '#EDE7FA',
  lavenderSoft: '#F6F2FD',
  lilac: '#D9CCF5', // période féconde
  pink: '#EC5F8C', // règles, actions
  pinkSoft: '#FDE4EC',
  gold: '#F5B85C', // ovulation, lune
  goldSoft: '#FEF3DF',
  green: '#3BB273',
  greenSoft: '#E3F6EC',
  red: '#E5484D',
  redSoft: '#FDECEC',
  background: '#FBF8FF',
  card: '#FFFFFF',
  text: '#2B1858',
  textMuted: '#6F6590',
  border: '#E6DFF5',
  white: '#FFFFFF',
};

export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  shadowColor: '#2B1858',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

export const phaseLabels: Record<string, string> = {
  menstrual: 'Règles',
  follicular: 'Phase folliculaire',
  ovulation: 'Ovulation (estimation)',
  luteal: 'Phase lutéale',
};

export const phaseMessages: Record<string, string> = {
  menstrual: 'Prends soin de toi, repose-toi si tu en as besoin.',
  follicular: 'Ton énergie remonte doucement !',
  ovulation: 'Tu te sens peut-être pleine d\'énergie.',
  luteal: 'Tes règles approchent, écoute ton corps.',
};
