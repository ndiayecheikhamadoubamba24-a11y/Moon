import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Meter } from '../../components/charts'
import { Button, Card, ErrorState, Loading, Notice, Pill } from '../../components/ui'
import { fmtNum } from '../../lib/format'
import { useApi } from '../../lib/hooks'

type Stats = {
  question: { id: number; prompt: string }
  plays: number
  success_rate: number | null
  distribution: { answer: string; label: string; count: number; percent: number; correct: boolean }[]
  reports: number
}

export default function QuestionStats() {
  const { id } = useParams()
  const { data, loading, error, reload } = useApi<Stats>(`/admin/questions/${id}/stats`)
  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorState message={error ?? ''} onRetry={reload} />
  const failRate = data.success_rate !== null ? 100 - data.success_rate : null

  return (
    <>
      <Link to="/jeux" className="mb-4 flex items-center gap-1 font-bold text-muted hover:text-night">
        <ArrowLeft className="size-4" /> Jeux et défis
      </Link>
      <h1 className="mb-5 text-xl font-black">Statistiques : {data.question.prompt}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <h2 className="mb-4 font-black">Répartition des réponses</h2>
          {data.distribution.length === 0 ? (
            <p className="text-sm text-muted">Pas encore de réponses enregistrées.</p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Répartition des réponses</caption>
              <tbody>
                {data.distribution.map((r) => (
                  <tr key={r.answer}>
                    <td className="w-1/3 py-2 pr-3 font-bold">
                      {r.label} {r.correct && <Pill tone="mint">bonne réponse</Pill>}
                    </td>
                    <td className="py-2">
                      <Meter value={r.percent} tone={r.correct ? 'mint' : 'pink'} />
                    </td>
                    <td className="w-20 py-2 text-right font-black">{r.percent} %</td>
                    <td className="w-16 py-2 text-right text-xs text-muted">{fmtNum(r.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {failRate !== null && failRate >= 50 && (
            <div className="mt-4">
              <Notice tone="danger" icon={<AlertTriangle className="size-4 shrink-0" />}>
                Cette question est ratée par {failRate} % des joueuses : vérifie qu'elle est claire.
              </Notice>
            </div>
          )}
        </Card>
        <Card className="space-y-4">
          <div>
            <div className="text-xs font-bold text-muted">Taux de réussite</div>
            <div className="text-3xl font-black">{data.success_rate ?? '—'} %</div>
            {data.success_rate !== null && <Meter value={data.success_rate} tone="mint" />}
          </div>
          <div>
            <div className="text-xs font-bold text-muted">Nombre de réponses</div>
            <div className="text-2xl font-black">{fmtNum(data.plays)}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-muted">Signalements</div>
            <div className="text-2xl font-black">{data.reports}</div>
          </div>
          <Link to={`/jeux/questions/${data.question.id}`}>
            <Button className="w-full">Modifier</Button>
          </Link>
        </Card>
      </div>
    </>
  )
}
