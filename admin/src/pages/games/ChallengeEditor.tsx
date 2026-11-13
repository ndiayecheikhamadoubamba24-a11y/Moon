import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, ErrorState, Field, Input, Loading, Notice, PhoneFrame, Select, Toggle } from '../../components/ui'
import { api, ApiError, errorMessage } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import type { Challenge } from './Challenges'

const GOALS: Record<string, string> = { correct_streak: "Bonnes réponses d'affilée", correct_answers: 'Nombre de bonnes réponses', games_played: 'Nombre de parties' }
const monday = () => {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
const sunday = () => {
  const d = new Date(monday())
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

export default function ChallengeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const existing = useApi<Challenge>(isNew ? null : `/admin/challenges/${id}`)
  const [c, setC] = useState<Partial<Challenge>>({ title: 'Défi de la semaine', description: '', goal: { type: 'correct_streak', value: 5 }, reward_points: 100, starts_on: monday(), ends_on: sunday(), is_active: true })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (existing.data) setC({ ...existing.data, starts_on: existing.data.starts_on.slice(0, 10), ends_on: existing.data.ends_on.slice(0, 10) })
  }, [existing.data])

  const save = async () => {
    setErrors({})
    try {
      const saved = await api<Challenge>(isNew ? '/admin/challenges' : `/admin/challenges/${id}`, { method: isNew ? 'POST' : 'PATCH', body: c })
      if (isNew) navigate(`/jeux/defis/${saved.id}`, { replace: true })
      setMsg('Défi enregistré.')
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors)
      setMsg(errorMessage(e))
    }
  }
  const remove = async () => {
    if (!confirm('Supprimer ce défi ?')) return
    await api(`/admin/challenges/${id}`, { method: 'DELETE' })
    navigate('/jeux')
  }

  if (existing.loading) return <Loading />
  if (existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />
  const err = (k: string) => errors[k]?.[0]
  const goal = c.goal ?? { type: 'correct_streak', value: 5 }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <Link to="/jeux" className="flex items-center gap-1 font-bold text-muted hover:text-night">
          <ArrowLeft className="size-4" /> Retour
        </Link>
        <h1 className="text-xl font-black">{isNew ? 'Nouveau défi' : 'Éditeur de défi'}</h1>
        <div className="ml-auto flex gap-2">
          <Button onClick={save}>{c.starts_on && c.starts_on > new Date().toISOString().slice(0, 10) ? 'Programmer' : 'Enregistrer'}</Button>
        </div>
      </div>
      {msg && (
        <div className="mb-4">
          <Notice tone={Object.keys(errors).length ? 'danger' : 'mint'}>{msg}</Notice>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="space-y-4">
          <Field label="Titre" required error={err('title')}>
            <Input value={c.title ?? ''} onChange={(e) => setC({ ...c, title: e.target.value })} />
          </Field>
          <Field label="Description" required error={err('description')}>
            <Input value={c.description ?? ''} onChange={(e) => setC({ ...c, description: e.target.value })} placeholder="Réponds juste à 5 questions d'affilée !" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type de défi" required>
              <Select value={goal.type} onChange={(e) => setC({ ...c, goal: { ...goal, type: e.target.value } })}>
                {Object.entries(GOALS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Objectif" required error={err('goal.value')}>
              <Input type="number" min={1} value={goal.value} onChange={(e) => setC({ ...c, goal: { ...goal, value: Number(e.target.value) } })} />
            </Field>
            <Field label="Jeu concerné">
              <Select value={goal.game_type ?? ''} onChange={(e) => setC({ ...c, goal: { ...goal, game_type: e.target.value || undefined } })}>
                <option value="">Tous les jeux</option>
                <option value="quiz">Quiz</option>
                <option value="myth_fact">Mythe ou réalité</option>
                <option value="association">Association</option>
              </Select>
            </Field>
            <Field label="Début" required error={err('starts_on')}>
              <Input type="date" value={c.starts_on} onChange={(e) => setC({ ...c, starts_on: e.target.value })} />
            </Field>
            <Field label="Fin" required error={err('ends_on')}>
              <Input type="date" value={c.ends_on} onChange={(e) => setC({ ...c, ends_on: e.target.value })} />
            </Field>
            <Field label="Récompense (points)">
              <Input type="number" min={0} value={c.reward_points} onChange={(e) => setC({ ...c, reward_points: Number(e.target.value) })} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-bold">
            <Toggle checked={!!c.is_active} onChange={(v) => setC({ ...c, is_active: v })} label="Actif" /> Défi actif
          </label>
          {!isNew && (
            <Button variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={remove}>
              Supprimer
            </Button>
          )}
        </Card>
        <div>
          <h3 className="mb-2 text-center font-black">Aperçu sur l'app</h3>
          <PhoneFrame>
            <div className="mt-6 rounded-2xl bg-gold-soft p-4 text-center">
              <div className="text-4xl">🏆</div>
              <div className="mt-2 font-black">{c.title}</div>
              <div className="text-xs">{c.description}</div>
              <div className="mt-3 inline-block rounded-full bg-gold px-3 py-1 text-xs font-black">⭐ +{c.reward_points} pts</div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </>
  )
}
