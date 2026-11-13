import { BarChart3, Check, ChevronDown, Gamepad2, MoreHorizontal, Plus, Trophy, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Checkbox, EmptyState, ErrorState, Input, Loading, Notice, PageHeader, Pagination, Pill, Select, StatCard, Table, Tabs, Toggle } from '../../components/ui'
import { api, errorMessage, qs, type Paginated } from '../../lib/api'
import { fmtDate, fmtNum } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import Badges from './Badges'
import Challenges from './Challenges'
import ImportCsv from './ImportCsv'

export type Question = {
  id: number
  game_id: number
  game: { id: number; type: 'quiz' | 'myth_fact' | 'association'; title: string; language: string }
  topic: string | null
  prompt: string
  difficulty: string
  is_active: boolean
  validated_at: string | null
  validator: { name: string } | null
  updated_at: string
  plays: number
  success_rate: number | null
}

export const TYPE_LABELS: Record<string, string> = { quiz: 'Quiz', myth_fact: 'Mythe ou réalité', association: 'Association' }
const TYPE_ICONS: Record<string, string> = { quiz: '❓', myth_fact: '✅', association: '🔗' }
const DIFF: Record<string, { label: string; dot: string }> = { facile: { label: 'Facile', dot: 'bg-mint' }, moyen: { label: 'Moyen', dot: 'bg-gold' }, difficile: { label: 'Difficile', dot: 'bg-danger' } }

type Overview = { active_questions: number; in_review: number; reported: number; average_success_rate: number | null; plays_this_month: number; not_validated: number; by_topic: { topic: string; count: number; percent: number }[] }

export default function Games() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'questions' | 'challenges' | 'badges'>('questions')
  const [menu, setMenu] = useState(false)
  const [importing, setImporting] = useState(false)
  const overview = useApi<Overview>('/admin/games-overview')

  return (
    <>
      <PageHeader
        icon={<Gamepad2 className="text-purple" />}
        title="Jeux et défis"
        crumbs={['Jeux et défis']}
        actions={
          <>
            <Button variant="outline" icon={<Upload className="size-4" />} onClick={() => setImporting(true)}>
              Importer
            </Button>
            <div className="relative">
              <Button icon={<Plus className="size-4" />} onClick={() => setMenu(!menu)}>
                Nouvelle question <ChevronDown className="size-4" />
              </Button>
              {menu && (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white shadow-xl" onMouseLeave={() => setMenu(false)}>
                  {[
                    ['Question de quiz', () => navigate('/jeux/questions/new?type=quiz')],
                    ['Mythe ou réalité', () => navigate('/jeux/questions/new?type=myth_fact')],
                    ["Jeu d'association", () => navigate('/jeux/questions/new?type=association')],
                    ['Défi', () => navigate('/jeux/defis/new')],
                    ['Badge', () => (setTab('badges'), setMenu(false))],
                  ].map(([label, fn]) => (
                    <button key={label as string} onClick={fn as () => void} className="block w-full px-4 py-2.5 text-left text-sm font-bold hover:bg-lavender-soft">
                      {label as string}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        }
      />
      <div className="mb-5">
        <Tabs
          tabs={[
            { value: 'questions', label: 'Questions' },
            { value: 'challenges', label: 'Défis' },
            { value: 'badges', label: 'Badges' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'questions' && (
        <>
          {overview.data && (
            <Card className="mb-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard icon="❓" label="Questions actives" value={overview.data.active_questions} />
                <StatCard icon="🕓" tone="gold" label="En relecture" value={overview.data.in_review} />
                <StatCard icon="⚠️" tone="pink" label="Signalées par les joueuses" value={overview.data.reported} />
                <StatCard icon={<Trophy className="mx-auto text-purple" />} label="Taux de réussite moyen" value={overview.data.average_success_rate !== null ? `${overview.data.average_success_rate} %` : '—'} />
                <StatCard icon="🎮" tone="mint" label="Parties jouées ce mois-ci" value={fmtNum(overview.data.plays_this_month)} />
              </div>
              <h3 className="mt-5 mb-2 flex items-center gap-2 font-black">
                <BarChart3 className="size-4 text-purple" /> Répartition des questions par thème
              </h3>
              <div className="flex h-3 overflow-hidden rounded-full bg-lavender">
                {overview.data.by_topic.map((t, i) => (
                  <div key={t.topic} title={`${t.topic} : ${t.percent} %`} style={{ width: `${t.percent}%`, opacity: 1 - i * 0.12 }} className="border-r-2 border-white bg-purple last:border-0" />
                ))}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold">
                {overview.data.by_topic.map((t, i) => (
                  <li key={t.topic} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-purple" style={{ opacity: 1 - i * 0.12 }} />
                    {t.topic} {t.percent} %
                  </li>
                ))}
              </ul>
              {overview.data.by_topic.length > 0 && overview.data.by_topic[overview.data.by_topic.length - 1].percent < 10 && (
                <div className="mt-3">
                  <Notice tone="gold">💡 Peu de questions sur « {overview.data.by_topic[overview.data.by_topic.length - 1].topic} » : pense à en ajouter.</Notice>
                </div>
              )}
            </Card>
          )}
          <QuestionBank topics={overview.data?.by_topic.map((t) => t.topic) ?? []} onChanged={overview.reload} />
        </>
      )}
      {tab === 'challenges' && <Challenges />}
      {tab === 'badges' && <Badges />}
      <ImportCsv open={importing} onClose={() => setImporting(false)} onDone={overview.reload} />
    </>
  )
}

function QuestionBank({ topics, onChanged }: { topics: string[]; onChanged: () => void }) {
  const [f, setF] = useState({ q: '', type: '', topic: '', difficulty: '', language: '', is_active: '', validated: '' })
  const [lowSuccess, setLowSuccess] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])
  const [msg, setMsg] = useState('')
  const list = useApi<Paginated<Question>>(`/admin/questions${qs({ ...f, page, max_success: lowSuccess ? 30 : '' })}`)
  const set = (k: keyof typeof f, v: string) => (setF({ ...f, [k]: v }), setPage(1))

  const bulk = async (action: string, extra: Record<string, unknown> = {}) => {
    try {
      const r = await api<{ updated: number }>('/admin/questions/bulk', { method: 'POST', body: { ids: selected, action, ...extra } })
      setMsg(`${r.updated} question(s) mise(s) à jour.`)
      setSelected([])
      list.reload()
      onChanged()
    } catch (e) {
      setMsg(errorMessage(e))
    }
  }

  const exportCsv = () => {
    const rows = list.data?.data.filter((q) => selected.includes(q.id)) ?? []
    const csv = ['type;enonce;theme;difficulte;actif', ...rows.map((q) => [q.game.type, `"${q.prompt.replace(/"/g, '""')}"`, q.topic ?? '', q.difficulty, q.is_active ? 'oui' : 'non'].join(';'))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'questions-moon.csv'
    a.click()
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input placeholder="Rechercher une question…" value={f.q} onChange={(e) => set('q', e.target.value)} className="max-w-xs" />
        <Select value={f.type} onChange={(e) => set('type', e.target.value)} className="w-auto">
          <option value="">Type</option>
          {Object.entries(TYPE_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={f.topic} onChange={(e) => set('topic', e.target.value)} className="w-auto">
          <option value="">Thème</option>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)} className="w-auto">
          <option value="">Difficulté</option>
          {Object.entries(DIFF).map(([k, d]) => (
            <option key={k} value={k}>
              {d.label}
            </option>
          ))}
        </Select>
        <Select value={f.language} onChange={(e) => set('language', e.target.value)} className="w-auto">
          <option value="">Langue</option>
          <option value="fr">FR</option>
          <option value="wo">WO</option>
        </Select>
        <Select value={f.is_active} onChange={(e) => set('is_active', e.target.value)} className="w-auto">
          <option value="">Statut</option>
          <option value="1">Actif</option>
          <option value="0">En relecture</option>
        </Select>
        <Select value={f.validated} onChange={(e) => set('validated', e.target.value)} className="w-auto">
          <option value="">Validation médicale</option>
          <option value="1">Validées</option>
          <option value="0">À valider</option>
        </Select>
        <label className="ml-auto flex items-center gap-2 text-xs font-bold">
          Taux de réussite &lt; 30 % <Toggle checked={lowSuccess} onChange={setLowSuccess} label="Taux de réussite inférieur à 30 %" />
        </label>
      </div>
      {msg && (
        <div className="mb-3">
          <Notice>{msg}</Notice>
        </div>
      )}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-lavender-soft px-4 py-2 text-sm font-bold">
          <Check className="size-4" /> {selected.length} sélectionnée(s) :
          <Button size="sm" variant="soft" onClick={() => bulk('activate')}>
            Activer
          </Button>
          <Button size="sm" variant="soft" onClick={() => bulk('deactivate')}>
            Envoyer en relecture
          </Button>
          <Button size="sm" variant="soft" onClick={() => bulk('validate')}>
            Valider médicalement
          </Button>
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              const topic = prompt('Nouveau thème :')
              if (topic) bulk('topic', { topic })
            }}
          >
            Changer de thème
          </Button>
          <Button size="sm" variant="soft" onClick={exportCsv}>
            Exporter
          </Button>
        </div>
      )}
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} forbidden={list.forbidden} />
      ) : !list.data?.data.length ? (
        <EmptyState icon={<span className="text-5xl">🌙</span>} title="Aucune question pour l'instant" action={<Link to="/jeux/questions/new?type=quiz"><Button size="sm">Créer ma première question</Button></Link>} />
      ) : (
        <Table head={[<Checkbox key="a" checked={selected.length === list.data.data.length} onChange={(v) => setSelected(v ? list.data!.data.map((q) => q.id) : [])} />, 'Énoncé', 'Type', 'Thème', 'Difficulté', 'Langue', 'Statut', 'Taux réussite', 'Nb jouées', 'Valid. méd.', 'Modifié le', '']}>
          {list.data.data.map((q) => (
            <tr key={q.id} className="hover:bg-lavender-soft/50">
              <td className="px-3 py-2.5">
                <Checkbox checked={selected.includes(q.id)} onChange={(v) => setSelected((s) => (v ? [...s, q.id] : s.filter((x) => x !== q.id)))} />
              </td>
              <td className="max-w-64 px-3 py-2.5">
                <Link to={`/jeux/questions/${q.id}`} className="line-clamp-2 font-bold hover:text-pink">
                  {q.prompt}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-lg" title={TYPE_LABELS[q.game.type]}>
                {TYPE_ICONS[q.game.type]}
              </td>
              <td className="px-3 py-2.5">{q.topic ?? '—'}</td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${DIFF[q.difficulty]?.dot}`} />
                  {DIFF[q.difficulty]?.label}
                </span>
              </td>
              <td className="px-3 py-2.5 uppercase">{q.game.language}</td>
              <td className="px-3 py-2.5">{q.is_active ? <Pill tone="mint">Actif</Pill> : <Pill tone="gold">En relecture</Pill>}</td>
              <td className={`px-3 py-2.5 font-bold ${q.success_rate !== null && q.success_rate < 30 ? 'text-danger' : ''}`}>{q.success_rate !== null ? `${q.success_rate} %` : '—'}</td>
              <td className="px-3 py-2.5">{fmtNum(q.plays)}</td>
              <td className="px-3 py-2.5" title={q.validator ? `Validée par ${q.validator.name}` : 'À valider'}>
                {q.validated_at ? <Check className="size-5 text-mint" /> : <span className="text-xs font-bold text-muted">À valider</span>}
              </td>
              <td className="px-3 py-2.5">{fmtDate(q.updated_at)}</td>
              <td className="px-3 py-2.5">
                <Link to={`/jeux/questions/${q.id}/stats`} aria-label="Statistiques">
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
