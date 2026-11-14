import { BookOpen, Flag, Gamepad2, HeartHandshake, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DailyLine, Meter } from '../components/charts'
import { Card, ErrorState, Loading, Notice, PageHeader, StatCard, Table } from '../components/ui'
import { useAuth } from '../lib/auth'
import { fmtNum } from '../lib/format'
import { useApi } from '../lib/hooks'

type Dash = {
  users: { total: number; active_30d: number; new_30d: number; by_age_range: Record<string, number | string>; by_region: Record<string, number | string> }
  modules: { published: number; in_review: number; completion_rate: number; top: { id: number; title: string; views_count: number; completion_rate: number }[] }
  games: { plays_30d: number; players_30d: number; average_score_rate: number }
  help_requests: { open: number; urgent_open: number; unassigned: number; response_rate: number; avg_first_response_hours: number | null }
  reports_open: number
}

export default function Dashboard() {
  const { staff, can } = useAuth()
  const { data, loading, error, reload } = useApi<Dash>('/admin/dashboard')
  const regs = useApi<{ by_day: { date: string; count: number }[] }>(can('moderator') ? '/admin/users-registrations' : null)

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />

  return (
    <>
      <PageHeader title={`Bonjour ${staff?.name.split(' ')[0]} 👋`} crumbs={['Tableau de bord']} />
      {data.help_requests.urgent_open > 0 && can('support') && (
        <div className="mb-4">
          <Notice tone="danger">
            <Link to="/demandes?priority=urgent" className="underline">
              {data.help_requests.urgent_open} demande(s) d'aide urgente(s) en attente
            </Link>
          </Notice>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard icon={<Users className="mx-auto text-purple" />} label="Actives (30 j)" value={fmtNum(data.users.active_30d)} hint={`${fmtNum(data.users.total)} comptes`} />
        <StatCard icon={<BookOpen className="mx-auto text-mint" />} tone="mint" label="Modules publiés" value={data.modules.published} hint={`Complétion ${data.modules.completion_rate} %`} />
        <StatCard icon={<Gamepad2 className="mx-auto text-pink" />} tone="pink" label="Parties (30 j)" value={fmtNum(data.games.plays_30d)} hint={`Réussite ${data.games.average_score_rate} %`} />
        <StatCard icon={<HeartHandshake className="mx-auto text-[#b07215]" />} tone="gold" label="Demandes ouvertes" value={data.help_requests.open} hint={`Taux de réponse ${data.help_requests.response_rate} %`} />
        <StatCard icon={<Flag className="mx-auto text-danger" />} tone="danger" label="Signalements" value={data.reports_open} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {regs.data && (
          <Card>
            <h2 className="mb-3 font-black">Nouvelles inscriptions par jour</h2>
            <DailyLine data={regs.data.by_day} label="Inscriptions" />
          </Card>
        )}
        <Card>
          <h2 className="mb-3 font-black">Modules les plus consultés</h2>
          <Table head={['Module', 'Lectures', 'Complétion']}>
            {data.modules.top.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2 font-bold">{m.title}</td>
                <td className="px-3 py-2">{fmtNum(m.views_count)}</td>
                <td className="w-40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Meter value={m.completion_rate} tone="mint" />
                    <span className="text-xs font-bold whitespace-nowrap">{m.completion_rate} %</span>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <h2 className="mb-3 font-black">Répartition par tranche d'âge</h2>
          <p className="mb-3 text-xs text-muted">Statistiques anonymisées : les groupes de moins de 5 personnes sont masqués.</p>
          <div className="space-y-2">
            {Object.entries(data.users.by_age_range).map(([age, n]) => (
              <div key={age} className="flex items-center gap-3 text-sm">
                <span className="w-28 font-bold">{age === 'non renseigné' ? age : `${age} ans`}</span>
                <Meter value={typeof n === 'number' ? (n / Math.max(data.users.total, 1)) * 100 : 0} />
                <span className="w-12 text-right font-bold">{n}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-black">Demandes d'aide</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">Non assignées</dt>
              <dd className="text-2xl font-black">{data.help_requests.unassigned}</dd>
            </div>
            <div>
              <dt className="text-muted">Délai moyen de 1re réponse</dt>
              <dd className="text-2xl font-black">{data.help_requests.avg_first_response_hours !== null ? `${data.help_requests.avg_first_response_hours} h` : '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  )
}
