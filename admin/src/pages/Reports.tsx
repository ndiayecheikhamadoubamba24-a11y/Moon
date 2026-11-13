import { Flag } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorState, Loading, Modal, Notice, PageHeader, Pagination, Pill, Select, Table, Tabs, Textarea } from '../components/ui'
import { api, errorMessage, type Paginated } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import { useApi } from '../lib/hooks'

type Report = { id: number; reportable_type: string; reportable_id: number; reason: string; details: string | null; status: string; created_at: string; resolution: string | null; reportable: Record<string, unknown> | null }
const REASONS: Record<string, string> = { inappropriate: 'Contenu inapproprié', wrong_info: 'Information erronée', abuse: 'Abus', spam: 'Spam', other: 'Autre' }
const KINDS: Record<string, string> = { Module: 'Module', Faq: 'FAQ', HelpMessage: "Message d'aide", Resource: 'Centre', Question: 'Question de jeu' }

const kindOf = (t: string) => KINDS[t.split('\\').pop() ?? ''] ?? t
const labelOf = (r: Report) => (r.reportable ? String(r.reportable.title ?? r.reportable.question ?? r.reportable.prompt ?? r.reportable.name ?? r.reportable.body ?? '').slice(0, 90) : 'Contenu supprimé')

export default function Reports() {
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload, forbidden } = useApi<Paginated<Report>>(`/admin/reports?status=${status}&page=${page}`)
  const [current, setCurrent] = useState<Report | null>(null)
  const [action, setAction] = useState('')
  const [resolution, setResolution] = useState('')
  const [msg, setMsg] = useState('')

  const handle = async (st: string) => {
    try {
      await api(`/admin/reports/${current!.id}`, { method: 'PATCH', body: { status: st, resolution, action: action || null } })
      setCurrent(null)
      reload()
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader icon={<Flag className="text-danger" />} title="Signalements" crumbs={['Signalements']} />
      <Card>
        <div className="mb-4">
          <Tabs tabs={[{ value: 'open', label: 'À traiter' }, { value: 'resolved', label: 'Traités' }, { value: 'dismissed', label: 'Classés' }]} value={status} onChange={(v) => (setStatus(v), setPage(1))} />
        </div>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} forbidden={forbidden} />
        ) : (
          <Table empty={!data?.data.length} head={['Réf.', 'Contenu', 'Type', 'Motif', 'Détails', 'Reçu le', '']}>
            {data?.data.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2.5 font-mono text-xs font-bold">SIG-{r.id}</td>
                <td className="max-w-xs px-3 py-2.5 font-bold">{labelOf(r)}</td>
                <td className="px-3 py-2.5">
                  <Pill>{kindOf(r.reportable_type)}</Pill>
                </td>
                <td className="px-3 py-2.5">{REASONS[r.reason] ?? r.reason}</td>
                <td className="max-w-xs px-3 py-2.5 text-xs text-muted">{r.details ?? '—'}</td>
                <td className="px-3 py-2.5">{fmtDateTime(r.created_at)}</td>
                <td className="px-3 py-2.5">
                  {r.status === 'open' ? (
                    <Button size="sm" onClick={() => (setCurrent(r), setAction(''), setResolution(''), setMsg(''))}>
                      Traiter
                    </Button>
                  ) : (
                    <span className="text-xs text-muted">{r.resolution}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {data && <Pagination page={data.current_page} last={data.last_page} onChange={setPage} />}
      </Card>
      <Modal
        open={!!current}
        onClose={() => setCurrent(null)}
        title={`Signalement SIG-${current?.id}`}
        footer={
          <>
            <Button variant="outline" onClick={() => handle('dismissed')}>
              Classer sans suite
            </Button>
            <Button onClick={() => handle('resolved')}>Marquer comme traité</Button>
          </>
        }
      >
        {current && (
          <div className="space-y-3 text-sm">
            <p>
              <b>{kindOf(current.reportable_type)} :</b> {labelOf(current)}
            </p>
            <p>
              <b>Motif :</b> {REASONS[current.reason]} {current.details && `— ${current.details}`}
            </p>
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Aucune action sur le contenu</option>
              <option value="unpublish">Dépublier / désactiver le contenu</option>
              <option value="delete">Supprimer le contenu</option>
            </Select>
            <Textarea placeholder="Résolution (visible dans l'historique)" value={resolution} onChange={(e) => setResolution(e.target.value)} />
            {msg && <Notice tone="danger">{msg}</Notice>}
          </div>
        )}
      </Modal>
    </>
  )
}
