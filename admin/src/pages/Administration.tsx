import { Settings, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorState, Field, Input, Loading, Notice, PageHeader, Pagination, Pill, Select, Table, Tabs } from '../components/ui'
import { api, errorMessage, type Paginated } from '../lib/api'
import { ROLE_LABELS } from '../lib/auth'
import { fmtDateTime } from '../lib/format'
import { useApi } from '../lib/hooks'

type Log = { id: number; action: string; subject_type: string | null; subject_id: number | null; meta: Record<string, unknown> | null; ip_address: string | null; created_at: string; user: { name: string; role: string } | null }

export default function Administration() {
  const [tab, setTab] = useState<'team' | 'audit'>('team')
  return (
    <>
      <PageHeader icon={<Settings className="text-purple" />} title="Administration" crumbs={['Administration']} actions={<Tabs tabs={[{ value: 'team', label: 'Équipe' }, { value: 'audit', label: "Journal d'audit" }]} value={tab} onChange={setTab} />} />
      {tab === 'team' ? <Team /> : <Audit />}
    </>
  )
}

function Team() {
  const { data, loading, error, reload } = useApi<Paginated<{ id: number; name: string; role: string; last_activity_date: string | null }>>('/admin/users?role=staff')
  const [f, setF] = useState({ name: '', email: '', role: 'educator' })
  const [msg, setMsg] = useState<{ tone: 'mint' | 'danger'; text: string } | null>(null)
  const create = async () => {
    try {
      const r = await api<{ temporary_password: string | null }>('/admin/staff', { method: 'POST', body: f })
      setMsg({ tone: 'mint', text: `Compte créé. Mot de passe temporaire (à transmettre de vive voix) : ${r.temporary_password}` })
      setF({ name: '', email: '', role: 'educator' })
      reload()
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }
  const changeRole = async (id: number, role: string) => {
    try {
      await api(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } })
      reload()
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <Table head={['Nom', 'Rôle']}>
            {data?.data.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2.5 font-bold">{s.name}</td>
                <td className="px-3 py-2.5">
                  <Select value={s.role} onChange={(e) => changeRole(s.id, e.target.value)} className="max-w-56">
                    {Object.entries(ROLE_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                    <option value="user">Retirer l'accès (utilisatrice)</option>
                  </Select>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-black">
          <UserPlus className="size-5" /> Ajouter un membre
        </h2>
        <Field label="Nom" required>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="E-mail" required>
          <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Rôle">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {Object.entries(ROLE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button className="w-full" onClick={create} disabled={!f.name || !f.email}>
          Créer le compte
        </Button>
      </Card>
    </div>
  )
}

function Audit() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useApi<Paginated<Log>>(`/admin/audit-logs?page=${page}${action ? `&action=${action}` : ''}`)
  return (
    <Card>
      <div className="mb-3 flex gap-2">
        <Select value={action} onChange={(e) => (setAction(e.target.value), setPage(1))} className="w-auto">
          <option value="">Toutes les actions</option>
          {['module', 'question', 'user', 'help_request', 'report', 'resource', 'announcement', 'staff'].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Table empty={!data?.data.length} head={['Date', 'Membre', 'Action', 'Objet', 'Détails']}>
          {data?.data.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
              <td className="px-3 py-2">
                {l.user?.name ?? '—'} {l.user && <Pill>{ROLE_LABELS[l.user.role] ?? l.user.role}</Pill>}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
              <td className="px-3 py-2">{l.subject_type ? `${l.subject_type} #${l.subject_id}` : '—'}</td>
              <td className="max-w-xs truncate px-3 py-2 font-mono text-[11px] text-muted">{l.meta ? JSON.stringify(l.meta) : ''}</td>
            </tr>
          ))}
        </Table>
      )}
      {data && <Pagination page={data.current_page} last={data.last_page} onChange={setPage} />}
    </Card>
  )
}
