import { ArrowDown, ArrowLeft, ArrowUp, BarChart3, Check, Eye, Plus, Send, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DailyLine } from '../../components/charts'
import { Button, Card, ErrorState, Field, Input, Loading, Modal, Notice, PhoneFrame, Pill, Select, Textarea } from '../../components/ui'
import { api, errorMessage, type Paginated } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtDateTime, fmtNum } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { STATUS } from './Modules'

type Section = { id?: number; type: string; title: string | null; body: string | null; media_url: string | null }
type Module = {
  id: number
  title: string
  summary: string | null
  status: 'draft' | 'review' | 'published' | 'archived'
  category_id: number | null
  level: string
  language: string
  duration_minutes: number
  cover_image: string | null
  tags: string[] | null
  scheduled_at: string | null
  published_at: string | null
  updated_at: string
  author: { name: string } | null
  sections: Section[]
}

const SECTION_TYPES: Record<string, string> = { text: 'Texte', image: 'Image', video: 'Vidéo', audio: 'Audio', infographic: 'Infographie' }
const BLOCKS = [
  { label: 'Texte', section: { type: 'text', title: '', body: '' } },
  { label: '⭐ À retenir', section: { type: 'text', title: 'À retenir', body: '' } },
  { label: '💡 Astuce', section: { type: 'text', title: 'Astuce', body: '' } },
  { label: 'Image', section: { type: 'image', title: '', body: '' } },
  { label: 'Vidéo', section: { type: 'video', title: '', body: '' } },
  { label: 'Audio', section: { type: 'audio', title: '', body: '' } },
]

export default function ModuleEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()
  const { data, loading, error, reload } = useApi<Module>(`/admin/modules/${id}`)
  const categories = useApi<Paginated<{ id: number; name: string }>>('/admin/categories?per_page=100')
  const [m, setM] = useState<Module | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [msg, setMsg] = useState<{ tone: 'danger' | 'mint'; text: string } | null>(null)
  const [panel, setPanel] = useState<'preview' | 'publish' | 'stats' | null>(null)
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (data) setM(data)
  }, [data])

  const update = (patch: Partial<Module>) => {
    setM((cur) => (cur ? { ...cur, ...patch } : cur))
    setDirty(true)
  }
  const updateSection = (i: number, patch: Partial<Section>) => update({ sections: m!.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) })
  const moveSection = (i: number, d: number) => {
    const s = [...m!.sections]
    ;[s[i], s[i + d]] = [s[i + d], s[i]]
    update({ sections: s })
  }

  const save = async () => {
    if (!m) return false
    setSaving(true)
    setMsg(null)
    try {
      const saved = await api<Module>(`/admin/modules/${m.id}`, {
        method: 'PATCH',
        body: {
          title: m.title,
          summary: m.summary,
          category_id: m.category_id,
          level: m.level,
          language: m.language,
          duration_minutes: m.duration_minutes,
          cover_image: m.cover_image,
          tags: m.tags ?? [],
          sections: m.sections.map(({ type, title, body, media_url }) => ({ type, title, body, media_url })),
        },
      })
      setM((cur) => (cur ? { ...cur, ...saved } : saved))
      setDirty(false)
      setSavedAt(new Date())
      return true
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
      return false
    } finally {
      setSaving(false)
    }
  }

  const transition = async (status: string, scheduled_at?: string) => {
    if (dirty && !(await save())) return
    try {
      await api(`/admin/modules/${m!.id}/status`, { method: 'POST', body: { status, scheduled_at } })
      setMsg({ tone: 'mint', text: `Statut : ${STATUS[status].label}` })
      setPanel(null)
      reload()
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }

  const remove = async () => {
    if (!confirm('Supprimer ce module ?')) return
    try {
      await api(`/admin/modules/${m!.id}`, { method: 'DELETE' })
      navigate('/modules')
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }

  if (loading && !m) return <Loading />
  if (error || !m) return <ErrorState message={error ?? ''} onRetry={reload} />
  const words = m.sections.reduce((n, s) => n + (s.body?.split(/\s+/).filter(Boolean).length ?? 0), 0)

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/modules" className="flex items-center gap-1 font-bold text-muted hover:text-night">
          <ArrowLeft className="size-4" /> Modules
        </Link>
        <Pill tone={STATUS[m.status].tone}>● {STATUS[m.status].label}</Pill>
        <span className="text-xs text-muted">{dirty ? 'Modifications non enregistrées' : savedAt ? `Enregistré à ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : `Modifié le ${fmtDateTime(m.updated_at)}`}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" icon={<Eye className="size-4" />} onClick={() => setPanel('preview')}>
            Aperçu
          </Button>
          <Button variant="outline" icon={<BarChart3 className="size-4" />} onClick={() => setPanel('stats')}>
            Statistiques
          </Button>
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Enregistrer
          </Button>
        </div>
      </div>
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-4">
          <Field label="Titre du module" required>
            <Input value={m.title} onChange={(e) => update({ title: e.target.value })} className="text-lg" />
          </Field>
          <Field label="Résumé (200 caractères max)" hint={`${(m.summary ?? '').length}/200`}>
            <Textarea maxLength={200} value={m.summary ?? ''} onChange={(e) => update({ summary: e.target.value })} />
          </Field>

          <div>
            <h3 className="mb-2 font-black">Contenu</h3>
            <div className="space-y-3">
              {m.sections.map((s, i) => (
                <div key={i} className={`rounded-2xl border p-4 ${s.title === 'À retenir' ? 'border-gold bg-gold-soft' : s.title === 'Astuce' ? 'border-lilac bg-lavender-soft' : 'border-line'}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Select value={s.type} onChange={(e) => updateSection(i, { type: e.target.value })} className="max-w-36 py-1 text-xs">
                      {Object.entries(SECTION_TYPES).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </Select>
                    <span className="text-xs font-bold text-muted">Étape {i + 1}</span>
                    <div className="ml-auto flex gap-1">
                      <button disabled={i === 0} onClick={() => moveSection(i, -1)} className="rounded p-1 hover:bg-white disabled:opacity-30" aria-label="Monter">
                        <ArrowUp className="size-4" />
                      </button>
                      <button disabled={i === m.sections.length - 1} onClick={() => moveSection(i, 1)} className="rounded p-1 hover:bg-white disabled:opacity-30" aria-label="Descendre">
                        <ArrowDown className="size-4" />
                      </button>
                      <button onClick={() => update({ sections: m.sections.filter((_, k) => k !== i) })} className="rounded p-1 text-danger hover:bg-white" aria-label="Supprimer l'étape">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <Input placeholder="Titre de l'étape (facultatif)" value={s.title ?? ''} onChange={(e) => updateSection(i, { title: e.target.value })} className="mb-2" />
                  {s.type !== 'text' && <Input placeholder="Lien du média (https://…)" value={s.media_url ?? ''} onChange={(e) => updateSection(i, { media_url: e.target.value })} className="mb-2" />}
                  <Textarea placeholder={s.type === 'text' ? 'Écris le contenu…' : 'Légende ou transcription (accessibilité)'} value={s.body ?? ''} onChange={(e) => updateSection(i, { body: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {BLOCKS.map((b) => (
                <Button key={b.label} size="sm" variant="soft" icon={<Plus className="size-3" />} onClick={() => update({ sections: [...m.sections, { ...b.section, media_url: null }] })}>
                  {b.label}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              ≈ {words} mots · environ {Math.max(1, Math.round(words / 150))} min de lecture
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="font-black">Workflow</h3>
            <ol className="flex items-center justify-between text-xs font-bold">
              {['draft', 'review', 'published'].map((st, i) => {
                const reached = ['draft', 'review', 'published'].indexOf(m.status) >= i
                return (
                  <li key={st} className="flex flex-col items-center gap-1">
                    <span className={`flex size-7 items-center justify-center rounded-full ${reached ? 'bg-mint text-white' : 'bg-lavender text-muted'}`}>{reached ? <Check className="size-4" /> : i + 1}</span>
                    {STATUS[st].label}
                  </li>
                )
              })}
            </ol>
            {m.status === 'draft' && (
              <Button className="w-full" icon={<Send className="size-4" />} onClick={() => transition('review')}>
                Envoyer en relecture
              </Button>
            )}
            {m.status === 'review' && (
              <>
                <Notice tone="gold">Contenu santé : à faire valider par un professionnel avant publication.</Notice>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => transition('draft')}>
                    Demander des modifications
                  </Button>
                  <Button className="flex-1" onClick={() => setPanel('publish')}>
                    Approuver
                  </Button>
                </div>
              </>
            )}
            {m.status === 'published' && (
              <>
                <p className="text-sm">
                  {m.scheduled_at && new Date(m.scheduled_at) > new Date() ? `Programmé pour le ${fmtDateTime(m.scheduled_at)}` : `Publié le ${fmtDateTime(m.published_at)}`}
                </p>
                <Button variant="outline" className="w-full" onClick={() => transition('archived')}>
                  Retirer de la publication
                </Button>
              </>
            )}
            {m.status === 'archived' && (
              <Button variant="outline" className="w-full" onClick={() => transition('draft')}>
                Repasser en brouillon
              </Button>
            )}
          </Card>

          <Card className="space-y-3">
            <h3 className="font-black">Informations</h3>
            <Field label="Catégorie">
              <Select value={m.category_id ?? ''} onChange={(e) => update({ category_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Sans catégorie</option>
                {categories.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Niveau">
                <Select value={m.level} onChange={(e) => update({ level: e.target.value })}>
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="avance">Avancé</option>
                </Select>
              </Field>
              <Field label="Langue">
                <Select value={m.language} onChange={(e) => update({ language: e.target.value })}>
                  <option value="fr">Français</option>
                  <option value="wo">Wolof</option>
                </Select>
              </Field>
            </div>
            <Field label="Durée (minutes)">
              <Input type="number" min={1} max={120} value={m.duration_minutes} onChange={(e) => update({ duration_minutes: Number(e.target.value) })} />
            </Field>
            <Field group label="Tags">
              <div className="flex flex-wrap gap-1">
                {(m.tags ?? []).map((t) => (
                  <Pill key={t}>
                    {t}
                    <button onClick={() => update({ tags: (m.tags ?? []).filter((x) => x !== t) })} aria-label={`Retirer ${t}`}>
                      ×
                    </button>
                  </Pill>
                ))}
              </div>
              <Input
                placeholder="Ajouter un tag puis Entrée"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault()
                    update({ tags: [...new Set([...(m.tags ?? []), tagInput.trim()])] })
                    setTagInput('')
                  }
                }}
                className="mt-1"
              />
            </Field>
            <Field label="Image de couverture (URL)">
              <Input value={m.cover_image ?? ''} onChange={(e) => update({ cover_image: e.target.value || null })} />
            </Field>
          </Card>
          {can('super_admin') || m.status === 'draft' ? (
            <Button variant="ghost" className="w-full text-danger" icon={<Trash2 className="size-4" />} onClick={remove}>
              Supprimer le module
            </Button>
          ) : null}
        </div>
      </div>

      <PublishModal open={panel === 'publish'} onClose={() => setPanel(null)} onPublish={(at) => transition('published', at)} />
      <Modal open={panel === 'preview'} onClose={() => setPanel(null)} title="Aperçu du module">
        <PhoneFrame>
          <div className="mb-3 flex h-32 items-center justify-center rounded-2xl bg-lavender text-5xl">{m.cover_image ? <img src={m.cover_image} alt="" className="h-full w-full rounded-2xl object-cover" /> : '📘'}</div>
          <h3 className="text-center text-lg font-black">{m.title}</h3>
          <p className="mt-1 text-center text-xs text-muted">{m.summary}</p>
          {m.sections.slice(0, 2).map((s, i) => (
            <div key={i} className="mt-3 rounded-xl bg-white p-3 text-xs">
              {s.title && <div className="mb-1 font-black">{s.title}</div>}
              {s.body}
            </div>
          ))}
          <div className="mt-4 rounded-full bg-night py-2 text-center text-xs font-black text-white">Lire le module</div>
        </PhoneFrame>
      </Modal>
      {panel === 'stats' && <StatsModal id={m.id} title={m.title} onClose={() => setPanel(null)} />}
    </>
  )
}

function PublishModal({ open, onClose, onPublish }: { open: boolean; onClose: () => void; onPublish: (at?: string) => void }) {
  const [mode, setMode] = useState<'now' | 'later'>('now')
  const [at, setAt] = useState('')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publication"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={mode === 'later' && !at} onClick={() => onPublish(mode === 'later' ? new Date(at).toISOString() : undefined)}>
            {mode === 'now' ? 'Publier maintenant' : 'Programmer'}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm font-bold">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'now'} onChange={() => setMode('now')} className="accent-purple" /> Publier maintenant
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'later'} onChange={() => setMode('later')} className="accent-purple" /> Programmer
        </label>
        {mode === 'later' && <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />}
        <Notice>Seuls les éducateurs et administrateurs peuvent publier.</Notice>
      </div>
    </Modal>
  )
}

function StatsModal({ id, title, onClose }: { id: number; title: string; onClose: () => void }) {
  const { data, loading } = useApi<{ views: number; started: number; completed: number; completion_rate: number | null; by_day: { date: string; count: number }[] }>(`/admin/modules/${id}/stats`)
  return (
    <Modal open onClose={onClose} title={`Statistiques : ${title}`} wide>
      {loading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-lavender-soft p-3">
              <div className="text-xs font-bold text-muted">Lectures</div>
              <div className="text-2xl font-black">{fmtNum(data.views)}</div>
            </div>
            <div className="rounded-xl bg-mint-soft p-3">
              <div className="text-xs font-bold text-muted">Complétion</div>
              <div className="text-2xl font-black">{data.completion_rate ?? '—'} %</div>
            </div>
            <div className="rounded-xl bg-gold-soft p-3">
              <div className="text-xs font-bold text-muted">Terminés</div>
              <div className="text-2xl font-black">
                {data.completed}/{data.started}
              </div>
            </div>
          </div>
          <h3 className="mb-2 font-black">Nouvelles lectrices par jour</h3>
          <DailyLine data={data.by_day} label="Lectrices" />
        </>
      )}
    </Modal>
  )
}
