import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorState, Loading, Pill, Tabs, cx } from '../../components/ui'
import { type Paginated } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { useApi } from '../../lib/hooks'

export type Challenge = { id: number; title: string; description: string; goal: { type: string; value: number; game_type?: string }; reward_points: number; starts_on: string; ends_on: string; is_active: boolean; game_id: number | null }

export function challengeState(c: Challenge): { label: string; tone: 'lavender' | 'mint' | 'gray' } {
  const today = new Date().toISOString().slice(0, 10)
  if (!c.is_active) return { label: 'Désactivé', tone: 'gray' }
  if (c.starts_on > today) return { label: 'Programmé', tone: 'lavender' }
  if (c.ends_on < today) return { label: 'Terminé', tone: 'gray' }
  return { label: 'En cours', tone: 'mint' }
}

export default function Challenges() {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const { data, loading, error, reload } = useApi<Paginated<Challenge>>('/admin/challenges?per_page=100')
  if (loading && !data) return <Loading />
  if (error) return <ErrorState message={error} onRetry={reload} />
  const items = data?.data ?? []

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <Tabs tabs={[{ value: 'list', label: 'Liste' }, { value: 'calendar', label: 'Calendrier' }]} value={view} onChange={setView} />
        <Link to="/jeux/defis/new">
          <Button icon={<Plus className="size-4" />}>Nouveau défi</Button>
        </Link>
      </div>
      {!items.length ? (
        <EmptyState icon={<span className="text-5xl">🏆</span>} title="Aucun défi" action={<Link to="/jeux/defis/new"><Button size="sm">Créer un défi</Button></Link>} />
      ) : view === 'list' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const st = challengeState(c)
            return (
              <Link key={c.id} to={`/jeux/defis/${c.id}`} className="rounded-2xl border border-line p-4 hover:ring-2 hover:ring-lilac">
                <div className="text-3xl">🏆</div>
                <h3 className="mt-2 font-black">{c.title}</h3>
                <p className="text-sm text-muted">{c.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Pill tone={st.tone}>{st.label}</Pill>
                  <span className="text-xs font-bold text-muted">
                    {fmtDate(c.starts_on)} → {fmtDate(c.ends_on)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <ChallengeCalendar items={items} />
      )}
    </Card>
  )
}

function ChallengeCalendar({ items }: { items: Challenge[] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const first = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const iso = (d: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="max-w-md">
      <div className="mb-2 flex items-center justify-between font-black">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mois précédent">
          <ChevronLeft />
        </button>
        {month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Mois suivant">
          <ChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d} className="font-bold text-muted">
            {d}
          </div>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = iso(i + 1)
          const hits = items.filter((c) => c.starts_on <= d && c.ends_on >= d && c.is_active)
          return (
            <div key={d} title={hits.map((h) => h.title).join(', ')} className={cx('rounded-lg py-2 font-bold', hits.length > 0 && 'bg-lavender text-purple', d === today && 'ring-2 ring-pink')}>
              {i + 1}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Les jours surlignés ont au moins un défi actif.</p>
    </div>
  )
}
