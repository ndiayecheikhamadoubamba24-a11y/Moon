import { MessageCircleQuestion, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorState, Field, Input, Loading, Modal, Notice, PageHeader, Pill, Select, Table, Tabs, Textarea } from '../components/ui'
import { api, errorMessage, type Paginated } from '../lib/api'
import { useApi } from '../lib/hooks'

const PHASES: Record<string, string> = { menstrual: 'Règles', follicular: 'Folliculaire', ovulation: 'Ovulation', luteal: 'Lutéale', any: 'Toutes' }
const TOPICS: Record<string, string> = { alimentation: 'Alimentation', activite: 'Activité', hygiene: 'Hygiène', repos: 'Repos', douleur: 'Douleur', hydratation: 'Hydratation', bien_etre: 'Bien-être' }

type Item = Record<string, any>

/** Conseils par phase, fiches pratiques et FAQ. */
export default function TipsFaq() {
  const [tab, setTab] = useState<'tips' | 'guides' | 'faqs'>('tips')
  const { data, loading, error, reload } = useApi<Paginated<Item>>(`/admin/${tab}?per_page=100`)
  const [edit, setEdit] = useState<Item | null>(null)
  const [err, setErr] = useState('')

  const save = async () => {
    try {
      await api(edit?.id ? `/admin/${tab}/${edit.id}` : `/admin/${tab}`, { method: edit?.id ? 'PATCH' : 'POST', body: edit })
      setEdit(null)
      reload()
    } catch (e) {
      setErr(errorMessage(e))
    }
  }
  const remove = async () => {
    if (!confirm('Supprimer ?')) return
    await api(`/admin/${tab}/${edit!.id}`, { method: 'DELETE' })
    setEdit(null)
    reload()
  }
  const blank: Record<typeof tab, Item> = {
    tips: { phase: 'follicular', topic: 'alimentation', title: '', body: '', is_active: true },
    guides: { kind: 'practical', title: '', body: '', is_active: true },
    faqs: { question: '', answer: '', is_published: true },
  }

  return (
    <>
      <PageHeader
        icon={<MessageCircleQuestion className="text-purple" />}
        title="Conseils et FAQ"
        crumbs={['Conseils et FAQ']}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => (setErr(''), setEdit(blank[tab]))}>
            Ajouter
          </Button>
        }
      />
      <div className="mb-4">
        <Tabs tabs={[{ value: 'tips', label: 'Conseils du jour' }, { value: 'guides', label: 'Fiches pratiques et alertes' }, { value: 'faqs', label: 'FAQ' }]} value={tab} onChange={setTab} />
      </div>
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <Table empty={!data?.data.length} head={tab === 'tips' ? ['Phase', 'Thème', 'Conseil', 'Statut'] : tab === 'guides' ? ['Type', 'Titre', 'Statut'] : ['Question', 'Réponse', 'Statut']}>
            {data?.data.map((it) => (
              <tr key={it.id} onClick={() => (setErr(''), setEdit(it))} className="cursor-pointer hover:bg-lavender-soft/50">
                {tab === 'tips' && (
                  <>
                    <td className="px-3 py-2.5">
                      <Pill>{PHASES[it.phase]}</Pill>
                    </td>
                    <td className="px-3 py-2.5">{TOPICS[it.topic]}</td>
                    <td className="px-3 py-2.5">
                      <b>{it.title}</b> — {it.body}
                    </td>
                  </>
                )}
                {tab === 'guides' && (
                  <>
                    <td className="px-3 py-2.5">{it.kind === 'alert' ? <Pill tone="danger">Alerte</Pill> : <Pill>Fiche</Pill>}</td>
                    <td className="px-3 py-2.5 font-bold">{it.title}</td>
                  </>
                )}
                {tab === 'faqs' && (
                  <>
                    <td className="max-w-sm px-3 py-2.5 font-bold">{it.question}</td>
                    <td className="max-w-md px-3 py-2.5 text-muted">{it.answer}</td>
                  </>
                )}
                <td className="px-3 py-2.5">{(it.is_active ?? it.is_published) ? <Pill tone="mint">Publié</Pill> : <Pill tone="gray">Masqué</Pill>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Modifier' : 'Ajouter'}
        footer={
          <>
            {edit?.id && (
              <Button variant="ghost" className="mr-auto text-danger" onClick={remove}>
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
          <div className="space-y-3">
            {tab === 'tips' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Phase">
                  <Select value={edit.phase} onChange={(e) => setEdit({ ...edit, phase: e.target.value })}>
                    {Object.entries(PHASES).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Thème">
                  <Select value={edit.topic} onChange={(e) => setEdit({ ...edit, topic: e.target.value })}>
                    {Object.entries(TOPICS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            {tab === 'guides' && (
              <Field label="Type">
                <Select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>
                  <option value="practical">Fiche pratique</option>
                  <option value="alert">Alerte éducative (consulter un professionnel)</option>
                </Select>
              </Field>
            )}
            {tab === 'faqs' ? (
              <>
                <Field label="Question" required>
                  <Input value={edit.question} onChange={(e) => setEdit({ ...edit, question: e.target.value })} />
                </Field>
                <Field label="Réponse" required>
                  <Textarea value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Titre" required>
                  <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                </Field>
                <Field label="Texte" required>
                  <Textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} className="min-h-40" />
                </Field>
              </>
            )}
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" className="accent-purple" checked={!!(edit.is_active ?? edit.is_published)} onChange={(e) => setEdit({ ...edit, ...(tab === 'faqs' ? { is_published: e.target.checked } : { is_active: e.target.checked }) })} />
              Publié dans l'app
            </label>
            {err && <Notice tone="danger">{err}</Notice>}
          </div>
        )}
      </Modal>
    </>
  )
}
