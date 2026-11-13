import { BarChart3, Filter, MoreHorizontal, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DailyLine } from '../../components/charts'
import { Button, Card, Checkbox, Drawer, ErrorState, Input, Loading, Notice, PageHeader, Pagination, Pill, Select, StatCard, Table, Tabs } from '../../components/ui'
import { qs, type Paginated } from '../../lib/api'
import { relative, since } from '../../lib/format'
import { useApi } from '../../lib/hooks'

export type UserRow = {
  id: number
  reference: string
  name: string
  status: 'active' | 'suspended'
  age_range: string | null
  language: string
  region: string | null
  created_at: string
  last_activity_date: string | null
  reports_count: number
  suspended_until: string | null
  suspension_reason: string | null
}

export function statusOf(u: Pick<UserRow, 'status' | 'last_activity_date'>): { label: string; tone: 'mint' | 'danger' | 'lavender' } {
  if (u.status === 'suspended') return { label: 'Suspendu', tone: 'danger' }
  const inactive = !u.last_activity_date || Date.now() - new Date(u.last_activity_date).getTime() > 182 * 86400000
  return inactive ? { label: 'Inactif', tone: 'lavender' } : { label: 'Actif', tone: 'mint' }
}

const AGES = ['12-14', '15-17', '18-21', '22-25', '25+']

export default function Users() {
  const [tab, setTab] = useState<'list' | 'inactive' | 'stats'>('list')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string[]>([])
  const [ages, setAges] = useState<string[]>([])
  const [language, setLanguage] = useState('')
  const [region, setRegion] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])
  const [drawer, setDrawer] = useState(false)

  const overview = useApi<{ active: number; new_this_week: number; suspended: number; inactive_6_months: number; regions: string[] }>('/admin/users-overview')
  const effectiveStatus = tab === 'inactive' ? ['inactive'] : status
  const list = useApi<Paginated<UserRow>>(tab === 'stats' ? null : `/admin/users${qs({ q, status: effectiveStatus, age_range: ages, language, region, sort, page })}`)
  const regs = useApi<{ new_registrations: number; active_accounts: number; retention_30d: number | null; by_day: { date: string; count: number }[] }>(tab === 'stats' ? '/admin/users-registrations' : null)

  const exportRefs = () => {
    const rows = list.data?.data.filter((u) => selected.includes(u.id)) ?? []
    const csv = ['reference;pseudo;statut;age;langue;region', ...rows.map((u) => [u.reference, u.name, statusOf(u).label, u.age_range ?? '', u.language, u.region ?? ''].join(';'))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'references-moon.csv'
    a.click()
  }

  return (
    <>
      <PageHeader
        icon={<UsersIcon className="text-purple" />}
        title="Utilisateurs"
        crumbs={['Utilisateurs']}
        actions={
          <Tabs
            tabs={[
              { value: 'list', label: 'Comptes' },
              { value: 'inactive', label: 'Comptes inactifs' },
              { value: 'stats', label: <span className="flex items-center gap-1"><BarChart3 className="size-4" /> Statistiques</span> },
            ]}
            value={tab}
            onChange={(v) => (setTab(v), setPage(1), setSelected([]))}
          />
        }
      />
      <div className="mb-5">
        <Notice icon={<ShieldCheck className="size-4 shrink-0" />}>
          Pour protéger la vie privée, cette liste n'affiche aucun nom, e-mail, téléphone ni donnée de santé. Les comptes sont identifiés par un pseudo et une référence.
        </Notice>
      </div>

      {tab === 'stats' ? (
        regs.loading || !regs.data ? (
          <Loading />
        ) : (
          <Card>
            <div className="mb-5 grid grid-cols-3 gap-3">
              <StatCard icon="👥" label="Nouvelles inscriptions (30 j)" value={regs.data.new_registrations} />
              <StatCard icon="✅" tone="mint" label="Comptes actifs" value={regs.data.active_accounts} />
              <StatCard icon="⭐" tone="gold" label="Taux de rétention à 30 jours" value={regs.data.retention_30d !== null ? `${regs.data.retention_30d} %` : '—'} />
            </div>
            <h2 className="mb-2 font-black">Évolution des inscriptions</h2>
            <DailyLine data={regs.data.by_day} label="Inscriptions" />
          </Card>
        )
      ) : (
        <>
          {tab === 'list' && overview.data && (
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard icon="✅" tone="mint" label="Comptes actifs" value={overview.data.active} onClick={() => setStatus(['active'])} active={status.join() === 'active'} />
              <StatCard icon="🌱" tone="pink" label="Nouvelles inscrites cette semaine" value={overview.data.new_this_week} />
              <StatCard icon="⏸️" label="Suspendus" value={overview.data.suspended} onClick={() => setStatus(['suspended'])} active={status.join() === 'suspended'} />
              <StatCard icon="⚠️" tone="gold" label="Inactifs depuis plus de 6 mois" value={overview.data.inactive_6_months} onClick={() => setTab('inactive')} />
            </div>
          )}
          {tab === 'inactive' && (
            <div className="mb-4">
              <Notice tone="gold">Les comptes inactifs depuis 24 mois reçoivent un avertissement, puis sont supprimés (conservation limitée des données).</Notice>
            </div>
          )}

          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Input placeholder="Rechercher par référence ou pseudo…" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} className="max-w-xs" />
              <Select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-auto">
                <option value="">Langue</option>
                <option value="fr">FR</option>
                <option value="wo">WO</option>
              </Select>
              <Select value={region} onChange={(e) => setRegion(e.target.value)} className="w-auto">
                <option value="">Région</option>
                {overview.data?.regions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
              <Button variant="outline" icon={<Filter className="size-4" />} onClick={() => setDrawer(true)}>
                Plus de filtres
              </Button>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto w-auto">
                <option value="recent">Tri : récents</option>
                <option value="activity">Tri : activité</option>
                <option value="reports">Tri : signalements</option>
              </Select>
            </div>

            {selected.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-lavender-soft px-4 py-2 text-sm font-bold">
                {selected.length} sélectionné(s)
                <Button size="sm" variant="soft" onClick={exportRefs}>
                  Exporter les références
                </Button>
                <span className="text-xs text-muted">Les actions sensibles se font compte par compte pour éviter les erreurs.</span>
              </div>
            )}

            {list.loading && !list.data ? (
              <Loading />
            ) : list.error ? (
              <ErrorState message={list.error} onRetry={list.reload} forbidden={list.forbidden} />
            ) : (
              <Table
                empty={!list.data?.data.length}
                head={[<Checkbox key="a" checked={!!list.data?.data.length && selected.length === list.data.data.length} onChange={(v) => setSelected(v ? list.data!.data.map((u) => u.id) : [])} />, 'Réf.', 'Pseudo', 'Statut', 'Âge', 'Langue', 'Région', 'Inscrite depuis', 'Dernière activité', 'Signalements', '']}
              >
                {list.data?.data.map((u) => {
                  const st = statusOf(u)
                  return (
                    <tr key={u.id} className="hover:bg-lavender-soft/50">
                      <td className="px-3 py-2.5">
                        <Checkbox checked={selected.includes(u.id)} onChange={(v) => setSelected((s) => (v ? [...s, u.id] : s.filter((x) => x !== u.id)))} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-bold">{u.reference}</td>
                      <td className="px-3 py-2.5">
                        <Link to={`/utilisateurs/${u.id}`} className="font-extrabold hover:text-pink">
                          {u.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </td>
                      <td className="px-3 py-2.5">{u.age_range ?? '—'}</td>
                      <td className="px-3 py-2.5 uppercase">{u.language}</td>
                      <td className="px-3 py-2.5">{u.region ?? '—'}</td>
                      <td className="px-3 py-2.5">{since(u.created_at)}</td>
                      <td className="px-3 py-2.5">{relative(u.last_activity_date)}</td>
                      <td className="px-3 py-2.5">{u.reports_count}</td>
                      <td className="px-3 py-2.5">
                        <Link to={`/utilisateurs/${u.id}`} aria-label="Ouvrir la fiche">
                          <MoreHorizontal className="size-5 text-muted" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </Table>
            )}
            {list.data && <Pagination page={list.data.current_page} last={list.data.last_page} total={list.data.total} from={list.data.from} to={list.data.to} onChange={setPage} />}
          </Card>
        </>
      )}

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Filtres"
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => (setStatus([]), setAges([]))}>
              Réinitialiser
            </Button>
            <Button className="flex-1" onClick={() => (setDrawer(false), setPage(1))}>
              Appliquer
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <h3 className="font-black">Statut</h3>
          {[
            ['active', 'Actif'],
            ['suspended', 'Suspendu'],
            ['inactive', 'Inactif (6 mois)'],
          ].map(([k, l]) => (
            <div key={k}>
              <Checkbox checked={status.includes(k)} onChange={(v) => setStatus((s) => (v ? [...s, k] : s.filter((x) => x !== k)))} label={l} />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="font-black">Âge</h3>
          {AGES.map((a) => (
            <div key={a}>
              <Checkbox checked={ages.includes(a)} onChange={(v) => setAges((s) => (v ? [...s, a] : s.filter((x) => x !== a)))} label={`${a} ans`} />
            </div>
          ))}
        </div>
      </Drawer>
    </>
  )
}
