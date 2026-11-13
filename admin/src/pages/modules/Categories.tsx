import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, ErrorState, Field, Input, Loading, Modal } from '../../components/ui'
import { api, errorMessage, type Paginated } from '../../lib/api'
import { useApi } from '../../lib/hooks'

type Category = { id: number; name: string; slug: string; icon: string | null; position: number }

export default function Categories() {
  const { data, loading, error, reload } = useApi<Paginated<Category>>('/admin/categories?per_page=100')
  const [editing, setEditing] = useState<Partial<Category> | null>(null)
  const [err, setErr] = useState('')

  const save = async () => {
    try {
      await api(editing?.id ? `/admin/categories/${editing.id}` : '/admin/categories', { method: editing?.id ? 'PATCH' : 'POST', body: { name: editing?.name, icon: editing?.icon, position: editing?.position } })
      setEditing(null)
      reload()
    } catch (e) {
      setErr(errorMessage(e))
    }
  }
  const remove = async (c: Category) => {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ? Les modules resteront, sans catégorie.`)) return
    await api(`/admin/categories/${c.id}`, { method: 'DELETE' })
    reload()
  }

  if (loading && !data) return <Loading />
  if (error) return <ErrorState message={error} onRetry={reload} />
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">Catégories</h2>
        <Button icon={<Plus className="size-4" />} onClick={() => (setErr(''), setEditing({ name: '', position: data?.data.length ?? 0 }))}>
          Nouvelle catégorie
        </Button>
      </div>
      <ul className="divide-y divide-line">
        {data?.data.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3">
            <GripVertical className="size-4 text-muted" />
            <span className="flex size-9 items-center justify-center rounded-full bg-gold-soft">{c.icon ? '✨' : '📁'}</span>
            <span className="flex-1 font-extrabold">{c.name}</span>
            <button onClick={() => (setErr(''), setEditing(c))} aria-label="Modifier" className="rounded-lg p-2 hover:bg-lavender-soft">
              <Pencil className="size-4" />
            </button>
            <button onClick={() => remove(c)} aria-label="Supprimer" className="rounded-lg p-2 text-danger hover:bg-danger-soft">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={!editing?.name}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nom" required error={err}>
            <Input value={editing?.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>
          <Field label="Ordre d'affichage">
            <Input type="number" value={editing?.position ?? 0} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>
    </Card>
  )
}
