import { HeartHandshake } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, ErrorState, Loading, PageHeader, Pagination, Pill, Select, Table, Tabs } from '../../components/ui'
import { qs, type Paginated } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'
import { useApi } from '../../lib/hooks'

export const HELP_TYPES: Record<string, string> = { information: 'Information', support: 'Soutien', protections: 'Besoin de protections', medical: 'Orientation médicale', question: 'Question anonyme' }
export const HELP_STATUS: Record<string, { label: string; tone: 'gold' | 'lavender' | 'mint' }> = { received: { label: 'Reçue', tone: 'gold' }, in_progress: { label: 'En cours', tone: 'lavender' }, resolved: { label: 'Traitée', tone: 'mint' } }

type Row = { id: number; type: string; subject: string | null; message: string; priority: string; status: string; created_at: string; assignee: { name: string } | null; user: { name: string; age_range: string | null } | null; messages_count: number }

export default function HelpQueue() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('open')
  const [priority, setPriority] = useState(params.get('priority') ?? '')
  const [type, setType] = useState('')
  const [assigned, setAssigned] = useState('')
  const [page, setPage] = useState(1)
  const list = useApi<Paginated<Row>>(`/admin/help-requests${qs({ status, priority, type, assigned, page })}`)

  return (
    <>
      <PageHeader icon={<HeartHandshake className="text-pink" />} title="Demandes d'aide" crumbs={["Demandes d'aide"]} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Tabs
            tabs={[
              { value: 'open', label: 'À traiter' },
              { value: 'received', label: 'Reçues' },
              { value: 'in_progress', label: 'En cours' },
              { value: 'resolved', label: 'Traitées' },
            ]}
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
          />
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
            <option value="">Priorité</option>
            <option value="urgent">Urgente</option>
            <option value="normal">Normale</option>
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
            <option value="">Type</option>
            {Object.entries(HELP_TYPES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
          <Select value={assigned} onChange={(e) => setAssigned(e.target.value)} className="w-auto">
            <option value="">Toutes</option>
            <option value="me">Assignées à moi</option>
            <option value="none">Non assignées</option>
          </Select>
        </div>
        {list.loading && !list.data ? (
          <Loading />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} forbidden={list.forbidden} />
        ) : (
          <Table empty={!list.data?.data.length} head={['Priorité', 'Demande', 'Type', 'De', 'Statut', 'Assignée à', 'Reçue le']}>
            {list.data?.data.map((h) => (
              <tr key={h.id} className="hover:bg-lavender-soft/50">
                <td className="px-3 py-2.5">{h.priority === 'urgent' ? <Pill tone="danger">Urgente</Pill> : <Pill tone="gray">Normale</Pill>}</td>
                <td className="max-w-sm px-3 py-2.5">
                  <Link to={`/demandes/${h.id}`} className="font-extrabold hover:text-pink">
                    {h.subject || h.message.slice(0, 80)}
                  </Link>
                </td>
                <td className="px-3 py-2.5">{HELP_TYPES[h.type]}</td>
                <td className="px-3 py-2.5">
                  {h.user?.name ?? 'Compte supprimé'} {h.user?.age_range && <span className="text-xs text-muted">({h.user.age_range})</span>}
                </td>
                <td className="px-3 py-2.5">
                  <Pill tone={HELP_STATUS[h.status].tone}>{HELP_STATUS[h.status].label}</Pill>
                </td>
                <td className="px-3 py-2.5">{h.assignee?.name ?? <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2.5">{fmtDateTime(h.created_at)}</td>
              </tr>
            ))}
          </Table>
        )}
        {list.data && <Pagination page={list.data.current_page} last={list.data.last_page} total={list.data.total} from={list.data.from} to={list.data.to} onChange={setPage} />}
      </Card>
    </>
  )
}
