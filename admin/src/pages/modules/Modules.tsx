import { Archive, BookOpen, FileEdit, Filter, LayoutGrid, List, MoreHorizontal, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Meter } from '../../components/charts'
import { Button, Card, Checkbox, Drawer, EmptyState, ErrorState, Input, Loading, PageHeader, Pagination, Pill, Select, StatCard, Table, Tabs } from '../../components/ui'
import { api, errorMessage, qs, type Paginated } from '../../lib/api'
import { fmtDate, fmtNum } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import Categories from './Categories'

export type ModuleRow = {
  id: number
  title: string
  slug: string
  status: 'draft' | 'review' | 'published' | 'archived'
  level: string
  language: string
  views_count: number
  completion_rate: number | null
  updated_at: string
  cover_image: string | null
  category: { id: number; name: string } | null
  author: { id: number; name: string } | null
}

export const STATUS: Record<string, { label: string; tone: 'gray' | 'gold' | 'mint' | 'lavender' }> = {
  draft: { label: 'Brouillon', tone: 'gray' },
  review: { label: 'En relecture', tone: 'gold' },
  published: { label: 'Publié', tone: 'mint' },
  archived: { label: 'Archivé', tone: 'lavender' },
}

export default function Modules() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [language, setLanguage] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [selected, setSelected] = useState<number[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tab, setTab] = useState<'modules' | 'categories'>('modules')
  const [busy, setBusy] = useState('')

  const list = useApi<Paginated<ModuleRow> & { counts: Record<string, number> }>(
    `/admin/modules${qs({ status, q, category_id: category, level, language, page, per_page: 12 })}`,
  )
  const categories = useApi<Paginated<{ id: number; name: string }>>('/admin/categories?per_page=100')
  const counts = list.data?.counts

  const bulk = async (to: 'review' | 'archived') => {
    setBusy(to)
    const errors: string[] = []
    for (const id of selected) {
      await api(`/admin/modules/${id}/status`, { method: 'POST', body: { status: to } }).catch((e) => errors.push(errorMessage(e)))
    }
    setBusy('')
    setSelected([])
    list.reload()
    if (errors.length) alert(`${errors.length} module(s) non modifié(s) : ${errors[0]}`)
  }

  const create = async () => {
    const m = await api<{ id: number }>('/admin/modules', { method: 'POST', body: { title: 'Nouveau module' } })
    navigate(`/modules/${m.id}`)
  }

  const statusCard = (key: string, label: string, tone: 'lavender' | 'gold' | 'mint' | 'pink', icon: React.ReactNode) => (
    <StatCard
      icon={icon}
      tone={tone}
      label={label}
      value={key === 'all' ? counts?.all ?? '…' : counts?.[key] ?? '…'}
      active={key === 'all' ? !status.length : status.length === 1 && status[0] === key}
      onClick={() => {
        setStatus(key === 'all' ? [] : [key])
        setPage(1)
      }}
    />
  )

  return (
    <>
      <PageHeader
        icon={<BookOpen className="text-pink" />}
        title="Modules"
        crumbs={['Modules']}
        actions={
          <>
            <Button icon={<Plus className="size-4" />} onClick={create}>
              Nouveau module
            </Button>
            <Tabs tabs={[{ value: 'modules', label: 'Modules' }, { value: 'categories', label: 'Catégories' }]} value={tab} onChange={setTab} />
          </>
        }
      />
      {tab === 'categories' ? (
        <Categories />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {statusCard('all', 'Tous', 'lavender', '📚')}
            {statusCard('draft', 'Brouillons', 'lavender', <FileEdit className="mx-auto text-muted" />)}
            {statusCard('review', 'En relecture', 'gold', '🟠')}
            {statusCard('published', 'Publiés', 'mint', '✅')}
            {statusCard('archived', 'Archivés', 'pink', <Archive className="mx-auto text-purple" />)}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Input placeholder="Rechercher un module" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} className="max-w-xs" />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-44">
              <option value="">Catégorie</option>
              {categories.data?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={level} onChange={(e) => setLevel(e.target.value)} className="max-w-36">
              <option value="">Niveau</option>
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </Select>
            <Button variant="outline" icon={<Filter className="size-4" />} onClick={() => setFiltersOpen(true)}>
              Filtres
            </Button>
            <div className="ml-auto flex gap-1">
              <Button variant={view === 'table' ? 'night' : 'outline'} size="sm" icon={<List className="size-4" />} onClick={() => setView('table')}>
                Tableau
              </Button>
              <Button variant={view === 'cards' ? 'night' : 'outline'} size="sm" icon={<LayoutGrid className="size-4" />} onClick={() => setView('cards')}>
                Cartes
              </Button>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-lavender-soft px-4 py-2 text-sm font-bold">
              {selected.length} sélectionné(s) :
              <Button size="sm" variant="soft" icon={<Send className="size-3" />} loading={busy === 'review'} onClick={() => bulk('review')}>
                Envoyer en relecture
              </Button>
              <Button size="sm" variant="soft" icon={<Archive className="size-3" />} loading={busy === 'archived'} onClick={() => bulk('archived')}>
                Archiver
              </Button>
            </div>
          )}

          <div className="mt-4">
            {list.loading && !list.data ? (
              <Loading />
            ) : list.error ? (
              <ErrorState message={list.error} onRetry={list.reload} forbidden={list.forbidden} />
            ) : !list.data?.data.length ? (
              <Card>
                <EmptyState icon={<span className="text-5xl">🌙</span>} title="Aucun module pour le moment" action={<Button onClick={create}>Créer mon premier module</Button>} />
              </Card>
            ) : view === 'table' ? (
              <Table head={[<Checkbox key="all" checked={selected.length === list.data.data.length} onChange={(v) => setSelected(v ? list.data!.data.map((m) => m.id) : [])} />, 'Titre', 'Catégorie', 'Statut', 'Auteur', 'Modifié le', 'Lectures', 'Complétion', '']}>
                {list.data.data.map((m) => (
                  <tr key={m.id} className="hover:bg-lavender-soft/50">
                    <td className="px-3 py-3">
                      <Checkbox checked={selected.includes(m.id)} onChange={(v) => setSelected((s) => (v ? [...s, m.id] : s.filter((x) => x !== m.id)))} />
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/modules/${m.id}`} className="font-extrabold hover:text-pink">
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{m.category?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      <Pill tone={STATUS[m.status].tone}>● {STATUS[m.status].label}</Pill>
                    </td>
                    <td className="px-3 py-3">{m.author?.name ?? '—'}</td>
                    <td className="px-3 py-3">{fmtDate(m.updated_at)}</td>
                    <td className="px-3 py-3">{m.status === 'published' ? fmtNum(m.views_count) : '–'}</td>
                    <td className="px-3 py-3">{m.completion_rate !== null ? `${m.completion_rate} %` : '–'}</td>
                    <td className="px-3 py-3">
                      <Link to={`/modules/${m.id}`} aria-label="Ouvrir">
                        <MoreHorizontal className="size-5 text-muted" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.data.data.map((m) => (
                  <Link key={m.id} to={`/modules/${m.id}`}>
                    <Card className="h-full transition hover:ring-2 hover:ring-lilac">
                      <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-lavender-soft text-5xl">{m.cover_image ? <img src={m.cover_image} alt="" className="h-full w-full rounded-xl object-cover" /> : '📘'}</div>
                      <Pill tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Pill>
                      <h3 className="mt-2 font-black">{m.title}</h3>
                      <p className="text-xs text-muted">
                        {m.category?.name ?? 'Sans catégorie'} · {m.author?.name ?? '—'}
                      </p>
                      {m.completion_rate !== null && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold">
                          <Meter value={m.completion_rate} tone="mint" /> {m.completion_rate} %
                        </div>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
            {list.data && <Pagination page={list.data.current_page} last={list.data.last_page} total={list.data.total} from={list.data.from} to={list.data.to} onChange={setPage} />}
          </div>

          <Drawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            title="Filtres"
            footer={
              <>
                <Button variant="outline" className="flex-1" onClick={() => (setStatus([]), setCategory(''), setLevel(''), setLanguage(''))}>
                  Réinitialiser
                </Button>
                <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                  Appliquer
                </Button>
              </>
            }
          >
            <div className="space-y-2">
              <h3 className="font-black">Statut</h3>
              {Object.entries(STATUS).map(([k, s]) => (
                <div key={k}>
                  <Checkbox checked={status.includes(k)} onChange={(v) => setStatus((cur) => (v ? [...cur, k] : cur.filter((x) => x !== k)))} label={`${s.label} (${counts?.[k] ?? 0})`} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="font-black">Langue</h3>
              <div>
                <Checkbox checked={language === 'fr'} onChange={(v) => setLanguage(v ? 'fr' : '')} label="Français" />
              </div>
              <div>
                <Checkbox checked={language === 'wo'} onChange={(v) => setLanguage(v ? 'wo' : '')} label="Wolof" />
              </div>
            </div>
          </Drawer>
        </>
      )}
    </>
  )
}
