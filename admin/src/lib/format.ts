export const fmtDate = (s?: string | null) => (s ? new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString('fr-FR') : '—')
export const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
export const fmtNum = (n?: number | null) => (n === null || n === undefined ? '—' : n.toLocaleString('fr-FR'))

export function relative(s?: string | null): string {
  if (!s) return 'Jamais'
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (days <= 0) return "Aujourd'hui"
  if (days < 7) return 'Cette semaine'
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine(s)`
  if (days < 180) return `Il y a ${Math.floor(days / 30)} mois`
  return 'Plus de 6 mois'
}

export function since(s?: string | null): string {
  if (!s) return '—'
  const months = Math.floor((Date.now() - new Date(s).getTime()) / (30 * 86400000))
  if (months < 1) return 'ce mois-ci'
  return `il y a ${months} mois`
}
