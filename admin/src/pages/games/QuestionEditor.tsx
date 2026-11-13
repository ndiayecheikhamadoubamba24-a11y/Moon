import { ArrowLeft, BarChart3, CheckCircle2, Circle, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Checkbox, ErrorState, Field, Input, Loading, Notice, PhoneFrame, Pill, Select, Textarea, cx } from '../../components/ui'
import { api, ApiError, errorMessage, type Paginated } from '../../lib/api'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { TYPE_LABELS } from './Games'

type Option = { key: string; label: string }
type Game = { id: number; type: 'quiz' | 'myth_fact' | 'association'; language: string; title: string }
type Draft = {
  id?: number
  game_id: number | null
  topic: string
  prompt: string
  options: Option[] | { left: string[]; right: string[] } | null
  answer: string | Record<string, number>
  explanation: string
  hint: string
  difficulty: string
  is_active: boolean
  module_id: number | null
  validated_at?: string | null
  validator?: { name: string } | null
  updated_at?: string
}

const JARGON = ['endomètre', 'lutéinisante', 'folliculostimulante', 'dysménorrhée', 'aménorrhée', 'ménorragie']

export default function QuestionEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const existing = useApi<Draft & { game: Game }>(isNew ? null : `/admin/questions/${id}`)
  const games = useApi<Paginated<Game>>('/admin/games?per_page=100')
  const modules = useApi<Paginated<{ id: number; title: string }>>('/admin/modules?per_page=100')
  const [d, setD] = useState<Draft | null>(null)
  const [type, setType] = useState<Game['type']>((params.get('type') as Game['type']) ?? 'quiz')
  const [language, setLanguage] = useState('fr')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [msg, setMsg] = useState<{ tone: 'danger' | 'mint'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [shuffle, setShuffle] = useState(true)

  useEffect(() => {
    if (existing.data) {
      setD({ ...existing.data, topic: existing.data.topic ?? '', explanation: existing.data.explanation ?? '', hint: existing.data.hint ?? '' })
      setType(existing.data.game.type)
      setLanguage(existing.data.game.language)
    } else if (isNew && !d) {
      setD({
        game_id: null,
        topic: '',
        prompt: '',
        options: type === 'quiz' ? [{ key: 'A', label: '' }, { key: 'B', label: '' }] : type === 'association' ? { left: ['', ''], right: ['', ''] } : null,
        answer: type === 'association' ? { '0': 0, '1': 1 } : type === 'myth_fact' ? 'fact' : 'A',
        explanation: '',
        hint: '',
        difficulty: 'facile',
        is_active: false,
        module_id: null,
      })
    }
  }, [existing.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const game = useMemo(() => games.data?.data.find((g) => g.type === type && g.language === language), [games.data, type, language])
  const set = (patch: Partial<Draft>) => setD((cur) => (cur ? { ...cur, ...patch } : cur))

  const checks = useMemo(() => {
    if (!d) return []
    const text = `${d.prompt} ${d.explanation}`.toLowerCase()
    const quizOptions = type === 'quiz' ? (d.options as Option[]) : []
    return [
      { ok: type !== 'quiz' || (quizOptions.filter((o) => o.key === d.answer).length === 1 && quizOptions.every((o) => o.label.trim())), label: type === 'quiz' ? 'Une seule bonne réponse' : 'Réponse définie' },
      { ok: d.explanation.trim().length >= 10, label: 'Explication présente' },
      { ok: !/[!?]{2,}|\b(nulle|honte|sale)\b/i.test(text) && text === text.replace(/[A-Z]{6,}/g, ''), label: 'Ton bienveillant' },
      { ok: !JARGON.some((j) => text.includes(j)), label: 'Pas de jargon' },
      { ok: !!d.validated_at, label: 'Validation médicale' },
    ]
  }, [d, type])

  const save = async (activate?: boolean) => {
    if (!d || !game) return
    setSaving(true)
    setErrors({})
    setMsg(null)
    const body = {
      game_id: game.id,
      topic: d.topic || null,
      prompt: d.prompt,
      options: type === 'myth_fact' ? null : d.options,
      answer: d.answer,
      explanation: d.explanation || null,
      hint: d.hint || null,
      difficulty: d.difficulty,
      module_id: d.module_id,
      is_active: activate ?? d.is_active,
    }
    try {
      const saved = await api<Draft>(d.id ? `/admin/questions/${d.id}` : '/admin/questions', { method: d.id ? 'PATCH' : 'POST', body })
      setSavedAt(new Date())
      if (!d.id) navigate(`/jeux/questions/${saved.id}`, { replace: true })
      set({ ...saved, topic: saved.topic ?? '', explanation: saved.explanation ?? '', hint: saved.hint ?? '' })
      setMsg({ tone: 'mint', text: activate === undefined ? 'Enregistré.' : activate ? 'Question activée : elle est visible dans l\'app.' : 'Question désactivée.' })
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors)
      setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  const validate = async (validated: boolean) => {
    if (!d?.id) return setMsg({ tone: 'danger', text: 'Enregistre la question avant la validation médicale.' })
    const q = await api<Draft>(`/admin/questions/${d.id}/validate`, { method: 'POST', body: { validated } })
    set({ validated_at: q.validated_at, validator: q.validator })
  }

  const remove = async () => {
    if (!d?.id || !confirm('Supprimer cette question ?')) return
    await api(`/admin/questions/${d.id}`, { method: 'DELETE' })
    navigate('/jeux')
  }

  if (existing.loading || !d) return <Loading />
  if (existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />
  const err = (k: string) => errors[k]?.[0]

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/jeux" className="flex items-center gap-1 font-bold text-muted hover:text-night">
          <ArrowLeft className="size-4" /> Retour
        </Link>
        <h1 className="text-xl font-black">{isNew ? 'Nouvelle question' : 'Modifier la question'}</h1>
        <Pill>{TYPE_LABELS[type]}</Pill>
        {d.id && (d.is_active ? <Pill tone="mint">Active</Pill> : <Pill tone="gold">En relecture</Pill>)}
        <span className="text-xs text-muted">{savedAt ? `Enregistrée à ${savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : d.updated_at ? `Modifiée le ${fmtDateTime(d.updated_at)}` : ''}</span>
        <div className="ml-auto flex gap-2">
          {d.id && (
            <Link to={`/jeux/questions/${d.id}/stats`}>
              <Button variant="outline" icon={<BarChart3 className="size-4" />}>
                Statistiques
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => save()} loading={saving} disabled={!game}>
            Enregistrer
          </Button>
          <Button onClick={() => save(!d.is_active)} disabled={!game}>
            {d.is_active ? 'Désactiver' : 'Activer'}
          </Button>
        </div>
      </div>
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
      {!game && games.data && <Notice tone="danger">Aucun jeu « {TYPE_LABELS[type]} » en {language.toUpperCase()} : crée-le d'abord.</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_260px_280px]">
        <Card className="space-y-4">
          {type === 'association' ? (
            <Field label="Consigne" required error={err('prompt')}>
              <Input value={d.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="Associe chaque terme à sa définition" />
            </Field>
          ) : (
            <Field label={type === 'myth_fact' ? 'Affirmation' : 'Énoncé'} required error={err('prompt')} hint={`${d.prompt.length}/300`}>
              <Textarea maxLength={300} value={d.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder={type === 'myth_fact' ? 'Le cycle dure toujours 28 jours.' : 'Peut-on faire du sport pendant les règles ?'} />
            </Field>
          )}

          {type === 'quiz' && <QuizOptions d={d} set={set} error={err('answer') ?? err('options')} />}
          {type === 'myth_fact' && (
            <Field group label="Réponse" required>
              <div className="grid grid-cols-2 gap-3">
                {(['myth', 'fact'] as const).map((v) => (
                  <button key={v} onClick={() => set({ answer: v })} className={cx('rounded-2xl border-2 py-4 font-black', d.answer === v ? 'border-pink bg-pink text-white' : 'border-line bg-lavender-soft')}>
                    {v === 'myth' ? 'Mythe' : 'Réalité'}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {type === 'association' && <AssociationPairs d={d} set={set} />}

          <Field label="Explication (affichée après la réponse)" hint="Bienveillante et courte : c'est le « À retenir » de l'app." error={err('explanation')}>
            <Textarea value={d.explanation} onChange={(e) => set({ explanation: e.target.value })} />
          </Field>
          {type === 'quiz' && (
            <Field label="Indice (facultatif)">
              <Input value={d.hint} onChange={(e) => set({ hint: e.target.value })} />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Thème">
              <Input value={d.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="Corps et cycle" />
            </Field>
            <Field label="Difficulté">
              <Select value={d.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </Select>
            </Field>
            <Field label="Langue">
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="fr">Français</option>
                <option value="wo">Wolof</option>
              </Select>
            </Field>
            <Field label="Module lié">
              <Select value={d.module_id ?? ''} onChange={(e) => set({ module_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Aucun</option>
                {modules.data?.data.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {type === 'association' && (
            <div className="space-y-1">
              <Checkbox checked={shuffle} onChange={setShuffle} label="Mélange automatique (dans l'app, la colonne de droite est toujours mélangée)" />
            </div>
          )}
          {d.id && (
            <Button variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={remove}>
              Supprimer la question
            </Button>
          )}
        </Card>

        <Card className="h-fit space-y-3">
          <h3 className="font-black">Qualité de la question</h3>
          <ul className="space-y-2 text-sm font-semibold">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                {c.ok ? <CheckCircle2 className="size-5 text-mint" /> : <Circle className="size-5 text-line" />}
                {c.label}
              </li>
            ))}
          </ul>
          {d.validated_at ? (
            <div className="rounded-xl bg-mint-soft p-3 text-xs">
              Validée par <b>{d.validator?.name ?? '—'}</b>
              <br />
              le {fmtDate(d.validated_at)}
              <button onClick={() => validate(false)} className="mt-1 block font-bold text-purple underline">
                Retirer la validation
              </button>
            </div>
          ) : (
            <Button variant="soft" size="sm" className="w-full" onClick={() => validate(true)}>
              Valider médicalement
            </Button>
          )}
          <p className="text-xs text-muted">Toute modification de l'énoncé, des réponses ou de l'explication retire la validation médicale.</p>
        </Card>

        <div>
          <h3 className="mb-2 text-center font-black">Aperçu sur téléphone</h3>
          <Preview d={d} type={type} />
        </div>
      </div>
    </>
  )
}

function QuizOptions({ d, set, error }: { d: Draft; set: (p: Partial<Draft>) => void; error?: string }) {
  const options = d.options as Option[]
  const update = (opts: Option[]) => set({ options: opts.map((o, i) => ({ ...o, key: String.fromCharCode(65 + i) })) })
  return (
    <Field group label="Options de réponse" required error={error} hint="Coche la bonne réponse. 4 options maximum.">
      <div className="space-y-2">
        {options.map((o, i) => (
          <div key={o.key} className="flex items-center gap-2">
            <input type="radio" name="good" checked={d.answer === o.key} onChange={() => set({ answer: o.key })} className="size-4 accent-purple" aria-label={`Option ${o.key} correcte`} />
            <Input value={o.label} onChange={(e) => update(options.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} placeholder={`Option ${o.key}`} />
            {d.answer === o.key && <Pill tone="mint">Bonne réponse</Pill>}
            {options.length > 2 && (
              <button
                onClick={() => {
                  update(options.filter((_, k) => k !== i))
                  if (d.answer === o.key) set({ answer: 'A' })
                }}
                className="p-1 text-danger"
                aria-label="Supprimer l'option"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <Button variant="ghost" size="sm" icon={<Plus className="size-3" />} onClick={() => update([...options, { key: '', label: '' }])}>
            Ajouter une option (max. 4)
          </Button>
        )}
      </div>
    </Field>
  )
}

function AssociationPairs({ d, set }: { d: Draft; set: (p: Partial<Draft>) => void }) {
  const opts = d.options as { left: string[]; right: string[] }
  const update = (left: string[], right: string[]) => set({ options: { left, right }, answer: Object.fromEntries(left.map((_, i) => [String(i), i])) })
  const dupes = new Set(opts.left.filter((l, i) => l && opts.left.indexOf(l) !== i))
  return (
    <Field group label="Paires (4 à 8)" required hint="Chaque terme est associé à la définition de la même ligne. Le mélange est fait dans l'app.">
      <div className="space-y-2">
        {opts.left.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="size-4 text-muted" />
            <Input value={l} onChange={(e) => update(opts.left.map((x, k) => (k === i ? e.target.value : x)), opts.right)} placeholder="Terme" className={dupes.has(l) ? 'border-danger' : ''} />
            <span className="text-muted">→</span>
            <Input value={opts.right[i]} onChange={(e) => update(opts.left, opts.right.map((x, k) => (k === i ? e.target.value : x)))} placeholder="Définition" />
            {opts.left.length > 2 && (
              <button onClick={() => update(opts.left.filter((_, k) => k !== i), opts.right.filter((_, k) => k !== i))} className="p-1 text-danger" aria-label="Supprimer la paire">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {dupes.size > 0 && <p className="text-xs font-bold text-danger">Doublon détecté : {[...dupes].join(', ')}</p>}
        {opts.left.length < 8 && (
          <Button variant="ghost" size="sm" icon={<Plus className="size-3" />} onClick={() => update([...opts.left, ''], [...opts.right, ''])}>
            Ajouter une paire
          </Button>
        )}
      </div>
    </Field>
  )
}

function Preview({ d, type }: { d: Draft; type: string }) {
  return (
    <PhoneFrame>
      {type === 'quiz' && (
        <>
          <p className="my-3 text-center text-sm font-black">{d.prompt || 'Ton énoncé…'}</p>
          <div className="space-y-1.5">
            {(d.options as Option[]).map((o) => (
              <div key={o.key} className={cx('flex items-center gap-2 rounded-xl border bg-white p-2 text-xs font-bold', o.key === d.answer ? 'border-mint' : 'border-line')}>
                <span className="flex size-5 items-center justify-center rounded-full bg-night text-[10px] text-white">{o.key}</span>
                {o.label || '…'}
              </div>
            ))}
          </div>
        </>
      )}
      {type === 'myth_fact' && (
        <>
          <div className="mt-6 rounded-2xl bg-white p-4 text-center text-sm font-black shadow">{d.prompt || 'Ton affirmation…'}</div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black text-white">
            <div className="rounded-xl bg-pink py-3 text-center">Mythe</div>
            <div className="rounded-xl bg-night py-3 text-center">Réalité</div>
          </div>
        </>
      )}
      {type === 'association' && (
        <>
          <p className="my-3 text-center text-xs font-black">{d.prompt || 'Associe chaque terme…'}</p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
            {(d.options as { left: string[]; right: string[] }).left.map((l, i) => (
              <div key={i} className="contents">
                <div className="rounded-lg bg-pink-soft p-2">{l || '…'}</div>
                <div className="rounded-lg border border-line bg-white p-2">{(d.options as { right: string[] }).right[(i + 1) % (d.options as { right: string[] }).right.length] || '…'}</div>
              </div>
            ))}
          </div>
        </>
      )}
      {d.explanation && (
        <div className="mt-4 rounded-xl bg-gold-soft p-2 text-[11px]">
          <b>💡 À retenir :</b> {d.explanation}
        </div>
      )}
    </PhoneFrame>
  )
}
