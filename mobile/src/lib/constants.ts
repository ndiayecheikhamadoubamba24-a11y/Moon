export const AVATARS = ['🌸', '🦋', '🌙', '⭐', '🌻', '🐱', '🦄', '🌈', '🍓', '🐼', '🌺', '💫'];

export const BADGE_ICONS: Record<string, string> = { star: '⭐', heart: '💖', trophy: '🏆', flame: '🔥', crown: '👑', book: '📚' };

export const HELP_TYPES = [
  { value: 'information', label: 'Une information', icon: 'information-circle', desc: 'Je me pose une question sur mon corps ou mes règles' },
  { value: 'support', label: 'Du soutien', icon: 'heart', desc: "J'ai besoin de parler à quelqu'un" },
  { value: 'protections', label: 'Des protections', icon: 'gift', desc: "Je n'ai pas de quoi me protéger" },
  { value: 'medical', label: 'Une orientation médicale', icon: 'medkit', desc: 'Douleurs, saignements, inquiétude' },
  { value: 'question', label: 'Une question anonyme', icon: 'chatbubble-ellipses', desc: 'Une éducatrice te répond, sans connaître ton nom' },
] as const;

export const HELP_STATUS: Record<string, { label: string; color: string }> = {
  received: { label: 'Reçue', color: '#F5B85C' },
  in_progress: { label: 'En cours', color: '#5B3FA8' },
  resolved: { label: 'Traitée', color: '#3BB273' },
};

export const RESOURCE_TYPES: Record<string, { label: string; icon: string }> = {
  youth_center: { label: 'Conseils ados', icon: 'heart' },
  health_center: { label: 'Centre de santé', icon: 'medkit' },
  ngo: { label: 'Association', icon: 'people' },
  distribution: { label: 'Protections', icon: 'gift' },
  hotline: { label: "Ligne d'écoute", icon: 'call' },
};

export const SERVICES: Record<string, { label: string; emoji: string }> = {
  ecoute: { label: 'Écoute et conseils', emoji: '🎧' },
  consultation: { label: 'Consultation médicale', emoji: '🩺' },
  protections: { label: 'Protections hygiéniques', emoji: '🩹' },
  planification: { label: 'Planification familiale', emoji: '📋' },
  infos: { label: 'Infos règles et santé', emoji: '📖' },
  orientation: { label: 'Orientation', emoji: '🧭' },
};
