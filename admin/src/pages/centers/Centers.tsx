import { Download, MapPin, MoreHorizontal, Phone, Plus, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Meter } from '../../components/charts'
import { Button, Card, Checkbox, EmptyState, ErrorState, Field, Input, Loading, Modal, Notice, PageHeader, Pagination, Pill, Select, StatCard, Table, Tabs } from '../../components/ui'
import { api, errorMessage, qs, type Paginated } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import ImportCsv from '../games/ImportCsv'

export type Center = {
  id: number
  name: string
  type: string
  description: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  opening_hours: Record<string, [string, string]> | null
  services: string[] | null
  languages: string[] | null
  is_free: boolean
  is_confidential: boolean
  is_accessible: boolean
  walk_in: boolean
  audience: string | null
  is_emergency: boolean
  is_active: boolean
  verified_at: string | null
  position_confirmed: boolean
  updated_at: string
}

export const TYPES: Record<string, { label: string; icon: string }> = {
  youth_center: { label: 'Centre de conseils ados', icon: '💗' },
  health_center: { label: 'Centre de santé', icon: '➕' },
  ngo: { label: 'Association / ONG', icon: '🤝' },
  distribution: { label: 'Distribution de protections', icon: '🎁' },
  hotline: { label: "Ligne d'écoute / urgence", icon: '📞' },
}

const stale = (c: Center) => !c.verified_at || Date.now() - new Date(c.verified_at).getTime() > 182 * 86400000

type Overview = { published: number; youth_centers: number; health_centers: number; to_verify: number; position_unconfirmed: number; suggestions_pending: number; coverage: { region: string; count: number; percent: number }[] }

const TEMPLATE = 'nom;type;adresse;quartier;ville;region;telephone;latitude;longitude;gratuit\nCentre de conseils de Pikine;conseils;Marché de Pikine;Pikine;Dakar;Dakar;77 123 45 67;14.7548;-17.3940;oui\n'

export default function Centers() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'centers' | 'verify' | 'suggestions' | 'contacts' | 'coverage'>('centers')
  const [importing, setImporting] = useState(false)
  const overview = useApi<Overview>('/admin/resources-overview')

  return (
    <>
      <PageHeader
        icon={<MapPin className="text-pink" />}
        title="Centres et contacts"
        crumbs={['Centres et contacts']}
        actions={
          <>
            <Button icon={<Plus className="size-4" />} onClick={() => navigate('/centres/new')}>
              Nouveau centre
            </Button>
            <Button variant="outline" icon={<Upload className="size-4" />} onClick={() => setImporting(true)}>
              Importer
            </Button>
          </>
        }
      />
      {overview.data && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard icon="💗" tone="pink" label="Centres publiés" value={overview.data.published} />
          <StatCard icon="➕" label="Centres de conseils ados" value={overview.data.youth_centers} />
          <StatCard icon="🏥" label="Centres de santé" value={overview.data.health_centers} />
          <StatCard icon="⚠️" tone="gold" label="À vérifier (> 6 mois)" value={overview.data.to_verify} onClick={() => setTab('verify')} />
          <StatCard icon="📍" tone="pink" label="Position non confirmée" value={overview.data.position_unconfirmed} onClick={() => setTab('verify')} />
        </div>
      )}
      <div className="mb-4">
        <Tabs
          tabs={[
            { value: 'centers', label: 'Centres' },
            { value: 'verify', label: `À vérifier${overview.data ? ` (${overview.data.to_verify})` : ''}` },
            { value: 'suggestions', label: `Signalements et propositions${overview.data ? ` (${overview.data.suggestions_pending})` : ''}` },
            { value: 'contacts', label: "Contacts d'urgence" },
            { value: 'coverage', label: 'Couverture' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'centers' && <CenterList onChanged={overview.reload} />}
      {tab === 'verify' && <CenterList toVerify onChanged={overview.reload} />}
      {tab === 'suggestions' && <Suggestions onChanged={overview.reload} />}
      {tab === 'contacts' && <Contacts />}
      {tab === 'coverage' && overview.data && (
        <Card>
          <h2 className="mb-1 font-black">Couverture par région</h2>
          <p className="mb-4 text-xs text-muted">Part des centres publiés, vérifiés depuis moins de 6 mois et dont la position est confirmée.</p>
          <table className="w-full text-sm">
            <tbody>
              {overview.data.coverage.map((r) => (
                <tr key={r.region}>
                  <td className="w-32 py-2 font-bold">{r.region}</td>
                  <td className="py-2">
                    <Meter value={r.percent} />
                  </td>
                  <td className="w-16 py-2 text-right font-black">{r.percent} %</td>
                  <td className="w-24 py-2 text-right text-xs text-muted">{r.count} centre(s)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <ImportCsv open={importing} onClose={() => setImporting(false)} onDone={overview.reload} endpoint="/admin/resources/import" template={TEMPLATE} filename="modele-centres.csv" />
    </>
  )
}

function CenterList({ toVerify, onChanged }: { toVerify?: boolean; onChanged: () => void }) {
  const [f, setF] = useState({ q: '', type: '', region: '', city: '', is_active: '' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])
  const [msg, setMsg] = useState('')
  const list = useApi<Paginated<Center>>(`/admin/resources${qs({ ...f, page, to_verify: toVerify ? 1 : '' })}`)
  const rows = list.data?.data.filter((c) => c.type !== 'hotline') ?? []

  const bulk = async (action: string, extra: Record<string, unknown> = {}) => {
    try {
      const r = await api<{ updated: number }>('/admin/resources/bulk', { method: 'POST', body: { ids: selected, action, ...extra } })
      setMsg(`${r.updated} centre(s) mis à jour.`)
      setSelected([])
      list.reload()
      onChanged()
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }
  const exportCsv = () => {
    const data = rows.filter((c) => !selected.length || selected.includes(c.id))
    const csv = ['nom;type;adresse;quartier;ville;region;telephone;latitude;longitude;gratuit', ...data.map((c) => [c.name, c.type, c.address ?? '', c.neighborhood ?? '', c.city ?? '', c.region ?? '', c.phone ?? '', c.latitude ?? '', c.longitude ?? '', c.is_free ? 'oui' : 'non'].join(';'))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'centres-moon.csv'
    a.click()
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Rechercher un centre…" value={f.q} onChange={(e) => (setF({ ...f, q: e.target.value }), setPage(1))} className="max-w-xs" />
        <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="w-auto">
          <option value="">Type</option>
          {Object.entries(TYPES)
            .filter(([k]) => k !== 'hotline')
            .map(([k, t]) => (
              <option key={k} value={k}>
                {t.label}
              </option>
            ))}
        </Select>
        <Input placeholder="Région" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} className="max-w-36" />
        <Input placeholder="Ville" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="max-w-36" />
        <Select value={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.value })} className="w-auto">
          <option value="">Statut</option>
          <option value="1">Publié</option>
          <option value="0">Non publié</option>
        </Select>
        <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv} className="ml-auto">
          Exporter
        </Button>
      </div>
      {msg && (
        <div className="mb-3">
          <Notice>{msg}</Notice>
        </div>
      )}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-lavender-soft px-4 py-2 text-sm font-bold">
          {selected.length} sélectionné(s) :
          <Button size="sm" variant="soft" onClick={() => bulk('verify')}>
            Marquer comme vérifié
          </Button>
          <Button size="sm" variant="soft" onClick={() => bulk('activate')}>
            Publier
          </Button>
          <Button size="sm" variant="soft" onClick={() => bulk('deactivate')}>
            Désactiver
          </Button>
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              const region = prompt('Nouvelle région :')
              if (region) bulk('region', { region })
            }}
          >
            Changer de région
          </Button>
        </div>
      )}
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} forbidden={list.forbidden} />
      ) : !rows.length ? (
        <EmptyState icon={<span className="text-5xl">🌙</span>} title={toVerify ? 'Tous les centres sont à jour 🎉' : 'Aucun centre à afficher pour ce filtre'} />
      ) : (
        <Table head={[<Checkbox key="a" checked={selected.length === rows.length} onChange={(v) => setSelected(v ? rows.map((c) => c.id) : [])} />, 'Nom', 'Type', 'Région', 'Ville', 'Adresse courte', 'Position', 'Téléphone', 'Statut', 'Vérifié le', '']}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-lavender-soft/50">
              <td className="px-3 py-2.5">
                <Checkbox checked={selected.includes(c.id)} onChange={(v) => setSelected((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
              </td>
              <td className="max-w-56 px-3 py-2.5">
                <Link to={`/centres/${c.id}`} className="font-extrabold hover:text-pink">
                  {c.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-lg" title={TYPES[c.type]?.label}>
                {TYPES[c.type]?.icon}
              </td>
              <td className="px-3 py-2.5">{c.region ?? '—'}</td>
              <td className="px-3 py-2.5">{c.city ?? '—'}</td>
              <td className="max-w-40 truncate px-3 py-2.5">{c.address ?? '—'}</td>
              <td className="px-3 py-2.5 text-xs">{c.latitude ? <span className={c.position_confirmed ? 'text-mint' : 'text-[#b07215]'}>{c.position_confirmed ? '✓' : '?'} {c.latitude.toFixed(4)}, {c.longitude?.toFixed(4)}</span> : <span className="font-bold text-danger">—</span>}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{c.phone ?? '—'}</td>
              <td className="px-3 py-2.5">{!c.is_active ? <Pill tone="gray">Non publié</Pill> : stale(c) ? <Pill tone="gold">À vérifier</Pill> : <Pill tone="mint">Publié</Pill>}</td>
              <td className="px-3 py-2.5">{fmtDate(c.verified_at)}</td>
              <td className="px-3 py-2.5">
                <Link to={`/centres/${c.id}`} aria-label="Modifier">
                  <MoreHorizontal className="size-5 text-muted" />
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {list.data && <Pagination page={list.data.current_page} last={list.data.last_page} total={list.data.total} from={list.data.from} to={list.data.to} onChange={setPage} />}
    </Card>
  )
}

function Suggestions({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState('pending')
  const { data, loading, reload } = useApi<Paginated<{ id: number; kind: 'new' | 'correction'; message: string; resource_id: number | null; status: string; created_at: string }>>(`/admin/resource-suggestions?status=${status}`)
  const update = async (id: number, s: string) => {
    await api(`/admin/resource-suggestions/${id}`, { method: 'PATCH', body: { status: s } })
    reload()
    onChanged()
  }
  return (
    <Card>
      <div className="mb-3">
        <Tabs tabs={[{ value: 'pending', label: 'À traiter' }, { value: 'accepted', label: 'Acceptées' }, { value: 'rejected', label: 'Refusées' }]} value={status} onChange={setStatus} />
      </div>
      {loading && !data ? (
        <Loading />
      ) : (
        <Table empty={!data?.data.length} head={['Type', 'Message', 'Centre', 'Reçu le', 'Actions']}>
          {data?.data.map((s) => (
            <tr key={s.id}>
              <td className="px-3 py-2.5">{s.kind === 'new' ? <Pill tone="mint">Centre proposé</Pill> : <Pill tone="gold">Erreur signalée</Pill>}</td>
              <td className="max-w-md px-3 py-2.5">{s.message}</td>
              <td className="px-3 py-2.5">{s.resource_id ? <Link to={`/centres/${s.resource_id}`} className="font-bold text-purple underline">Ouvrir la fiche</Link> : '—'}</td>
              <td className="px-3 py-2.5">{fmtDate(s.created_at)}</td>
              <td className="px-3 py-2.5">
                {s.status === 'pending' && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="soft" onClick={() => update(s.id, 'accepted')}>
                      Traité
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update(s.id, 'rejected')}>
                      Refuser
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  )
}

function Contacts() {
  const { data, loading, error, reload } = useApi<Paginated<Center>>('/admin/resources?type=hotline&per_page=100')
  const [edit, setEdit] = useState<Partial<Center> | null>(null)
  const [err, setErr] = useState('')
  const save = async () => {
    try {
      await api(edit?.id ? `/admin/resources/${edit.id}` : '/admin/resources', { method: edit?.id ? 'PATCH' : 'POST', body: { ...edit, type: 'hotline', is_emergency: true } })
      setEdit(null)
      reload()
    } catch (e) {
      setErr(errorMessage(e))
    }
  }
  if (loading && !data) return <Loading />
  if (error) return <ErrorState message={error} onRetry={reload} />
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card>
        <div className="mb-3 flex justify-end">
          <Button icon={<Plus className="size-4" />} onClick={() => (setErr(''), setEdit({ name: '', phone: '', description: '', is_active: true }))}>
            Nouveau contact
          </Button>
        </div>
        <ul className="divide-y divide-line">
          {data?.data.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <Phone className="size-5 text-pink" />
              <div className="flex-1">
                <div className="font-black">{c.name}</div>
                <div className="text-lg font-black text-purple">{c.phone}</div>
                <div className="text-xs text-muted">{c.description}</div>
              </div>
              {!c.is_active && <Pill tone="gray">Masqué</Pill>}
              <Button size="sm" variant="outline" onClick={() => (setErr(''), setEdit(c))}>
                Modifier
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="h-fit bg-lavender-soft text-center">
        <div className="text-4xl">💜</div>
        <p className="mt-2 text-sm font-bold">Ces numéros sont affichés dans l'app (bouton « aide urgente ») et restent disponibles hors ligne.</p>
        <p className="mt-2 text-xs text-muted">Vérifie chaque numéro auprès de l'organisme avant de le publier.</p>
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Modifier le contact' : "Nouveau contact d'urgence"}
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={!edit?.name || !edit?.phone}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" required>
            <Input value={edit?.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Urgences médicales" />
          </Field>
          <Field label="Numéro" required>
            <Input value={edit?.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="1515" />
          </Field>
          <Field label="Description">
            <Input value={edit?.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Appel gratuit 24h/24" />
          </Field>
          <Checkbox checked={!!edit?.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Afficher dans l'app" />
          {err && <Notice tone="danger">{err}</Notice>}
        </div>
      </Modal>
    </div>
  )
}
