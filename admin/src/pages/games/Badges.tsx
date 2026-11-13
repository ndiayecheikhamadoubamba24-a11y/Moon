import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorState, Field, Input, Loading, Modal, Pill, Select } from '../../components/ui'
import { api, ApiError, errorMessage, type Paginated } from '../../lib/api'
import { useApi } from '../../lib/hooks'

type Badge = { id: number; code: string; name: string; description: string; icon: string | null; criteria: { type: string; value: number } }
const ICONS: Record<string, string> = { star: '⭐', heart: '💖', trophy: '🏆', flame: '🔥', crown: '👑', book: '📚' }
const CRITERIA: Record<string, string> = { games_played: 'Parties jouées', correct_answers: 'Bonnes réponses', perfect_score: 'Scores parfaits', streak: 'Jours de série', modules_completed: 'Modules terminés', points: 'Points' }

export default function Badges() {
  const { data, loading, error, reload } = useApi<Paginated<Badge>>('/admin/badges?per_page=100')
  const [edit, setEdit] = useState<Partial<Badge> | null>(null)
  const [err, setErr] = useState('')

  const save = async () => {
    try {
      await api(edit?.id ? `/admin/badges/${edit.id}` : '/admin/badges', { method: edit?.id ? 'PATCH' : 'POST', body: edit })
      setEdit(null)
      reload()
    } catch (e) {
      setErr(e instanceof ApiError ? e.first : errorMessage(e))
    }
  }

  if (loading && !data) return <Loading />
  if (error) return <ErrorState message={error} onRetry={reload} />
  return (
    <Card>
      <div className="mb-4 flex justify-end">
        <Button icon={<Plus className="size-4" />} onClick={() => (setErr(''), setEdit({ code: '', name: '', description: '', icon: 'star', criteria: { type: 'games_played', value: 1 } }))}>
          Nouveau badge
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data?.data.map((b) => (
          <button key={b.id} onClick={() => (setErr(''), setEdit(b))} className="rounded-2xl bg-gold-soft p-4 text-center hover:ring-2 hover:ring-gold">
            <div className="text-4xl">{ICONS[b.icon ?? ''] ?? '🏅'}</div>
            <div className="mt-2 font-black">{b.name}</div>
            <div className="text-xs text-muted">
              {CRITERIA[b.criteria.type]} ≥ {b.criteria.value}
            </div>
            <Pill tone="mint" className="mt-2">
              Actif
            </Pill>
          </button>
        ))}
      </div>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Éditeur de badge"
        footer={
          <>
            {edit?.id && (
              <Button
                variant="ghost"
                className="mr-auto text-danger"
                onClick={async () => {
                  if (confirm('Supprimer ce badge ? Les joueuses le perdront.')) {
                    await api(`/admin/badges/${edit.id}`, { method: 'DELETE' })
                    setEdit(null)
                    reload()
                  }
                }}
              >
                Supprimer
              </Button>
            )}
            <Button variant="outline" onClick={() => setEdit(null)}>
              Annuler
            </Button>
            <Button onClick={save}>Enregistrer</Button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-3">
            <div className="text-center text-5xl">{ICONS[edit.icon ?? ''] ?? '🏅'}</div>
            <Field label="Nom" required>
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Première étape" />
            </Field>
            <Field label="Code (unique)" required>
              <Input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} placeholder="first_step" />
            </Field>
            <Field label="Description" required>
              <Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Bravo pour ton premier quiz !" />
            </Field>
            <Field label="Icône">
              <Select value={edit.icon ?? 'star'} onChange={(e) => setEdit({ ...edit, icon: e.target.value })}>
                {Object.entries(ICONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v} {k}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Critère">
                <Select value={edit.criteria?.type} onChange={(e) => setEdit({ ...edit, criteria: { ...edit.criteria!, type: e.target.value } })}>
                  {Object.entries(CRITERIA).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Seuil">
                <Input type="number" min={1} value={edit.criteria?.value} onChange={(e) => setEdit({ ...edit, criteria: { ...edit.criteria!, value: Number(e.target.value) } })} />
              </Field>
            </div>
            {err && <p className="text-sm font-bold text-danger">{err}</p>}
          </div>
        )}
      </Modal>
    </Card>
  )
}
