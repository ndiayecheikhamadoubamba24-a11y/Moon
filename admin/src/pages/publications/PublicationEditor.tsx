import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Checkbox, ErrorState, Field, Input, Loading, Notice, Pill, Select, Textarea } from '../../components/ui'
import { api, ApiError, errorMessage } from '../../lib/api'
import { fmtDateTime } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { CATEGORIES } from '../../site/config'
import { CategoryTag, PublicationCover, RichText } from '../../site/ui'
import { publicationState, type Publication } from './Publications'

const EMPTY: Partial<Publication> = { title: '', category: 'actualite', excerpt: '', body: '', cover_image: '', status: 'draft', featured: false, published_at: null }

/** Convertit une date ISO en valeur de champ datetime-local (heure locale). */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function PublicationEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const existing = useApi<Publication>(isNew ? null : `/admin/publications/${id}`)
  const [p, setP] = useState<Partial<Publication>>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [msg, setMsg] = useState<{ tone: 'mint' | 'danger'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState(false)

  useEffect(() => {
    if (existing.data) {
      setP(existing.data)
      setSchedule(!!existing.data.published_at && new Date(existing.data.published_at) > new Date())
    }
  }, [existing.data])
  const set = (patch: Partial<Publication>) => setP((cur) => ({ ...cur, ...patch }))

  const save = async (statusOverride?: 'draft' | 'published') => {
    setSaving(true)
    setErrors({})
    setMsg(null)
    const status = statusOverride ?? p.status ?? 'draft'
    try {
      const saved = await api<Publication>(isNew ? '/admin/publications' : `/admin/publications/${id}`, {
        method: isNew ? 'POST' : 'PATCH',
        body: {
          title: p.title,
          category: p.category,
          excerpt: p.excerpt || null,
          body: p.body,
          cover_image: p.cover_image || null,
          featured: !!p.featured,
          status,
          published_at: status === 'published' ? (schedule && p.published_at ? p.published_at : p.published_at && new Date(p.published_at) <= new Date() ? p.published_at : new Date().toISOString()) : p.published_at ?? null,
        },
      })
      setP(saved)
      if (isNew) navigate(`/publications/${saved.id}`, { replace: true })
      const st = publicationState(saved)
      setMsg({ tone: 'mint', text: st.label === 'En ligne' ? 'Publication en ligne sur le site.' : st.label === 'Programmée' ? `Publication programmée le ${fmtDateTime(saved.published_at)}.` : 'Brouillon enregistré.' })
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors)
      setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm('Supprimer définitivement cette publication ?')) return
    await api(`/admin/publications/${id}`, { method: 'DELETE' })
    navigate('/publications')
  }

  if (existing.loading) return <Loading />
  if (existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} forbidden={existing.forbidden} />
  const err = (k: string) => errors[k]?.[0]
  const st = publicationState({ status: p.status ?? 'draft', published_at: p.published_at ?? null })

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/publications" className="flex items-center gap-1 font-bold text-muted hover:text-night">
          <ArrowLeft className="size-4" /> Publications
        </Link>
        <h1 className="text-xl font-black">{isNew ? 'Nouvelle publication' : 'Modifier la publication'}</h1>
        {!isNew && <Pill tone={st.tone}>{st.label}</Pill>}
        <div className="ml-auto flex flex-wrap gap-2">
          {!isNew && st.label === 'En ligne' && (
            <a href={`/publications/${p.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" icon={<ExternalLink className="size-4" />}>
                Voir sur le site
              </Button>
            </a>
          )}
          <Button variant="outline" loading={saving} onClick={() => save('draft')} disabled={!p.title || !p.body}>
            {p.status === 'published' ? 'Retirer du site' : 'Enregistrer le brouillon'}
          </Button>
          <Button loading={saving} onClick={() => save('published')} disabled={!p.title || !p.body || (schedule && !p.published_at)}>
            {schedule ? 'Programmer' : p.status === 'published' ? 'Mettre à jour' : 'Publier'}
          </Button>
        </div>
      </div>
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="space-y-4">
          <Field label="Titre" required error={err('title')}>
            <Input value={p.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="28 mai : Journée mondiale de l'hygiène menstruelle" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Catégorie">
              <Select value={p.category} onChange={(e) => set({ category: e.target.value })}>
                {Object.entries(CATEGORIES).map(([k, c]) => (
                  <option key={k} value={k}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Image de couverture (URL, facultatif)" error={err('cover_image')}>
              <Input value={p.cover_image ?? ''} onChange={(e) => set({ cover_image: e.target.value })} placeholder="https://…" />
            </Field>
          </div>
          <Field label="Chapeau (résumé affiché sur les cartes)" hint={`${(p.excerpt ?? '').length}/300`} error={err('excerpt')}>
            <Textarea maxLength={300} value={p.excerpt ?? ''} onChange={(e) => set({ excerpt: e.target.value })} className="min-h-20" />
          </Field>
          <Field label="Texte" required hint="Une ligne vide entre deux paragraphes. « ## » au début d'une ligne pour un intertitre, « - » pour une liste." error={err('body')}>
            <Textarea value={p.body ?? ''} onChange={(e) => set({ body: e.target.value })} className="min-h-80 font-mono text-[13px]" />
          </Field>
          <div className="flex flex-wrap items-center gap-6 rounded-xl bg-lavender-soft p-4">
            <Checkbox checked={!!p.featured} onChange={(v) => set({ featured: v })} label="À la une (affichée en premier)" />
            <Checkbox checked={schedule} onChange={setSchedule} label="Programmer la publication" />
            {schedule && (
              <Input type="datetime-local" value={toLocalInput(p.published_at)} onChange={(e) => set({ published_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-auto" />
            )}
          </div>
          {!isNew && (
            <Button variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={remove}>
              Supprimer la publication
            </Button>
          )}
        </Card>

        <div>
          <h2 className="mb-2 font-black">Aperçu</h2>
          <div className="overflow-hidden rounded-3xl border border-line bg-white">
            <PublicationCover p={{ cover_image: p.cover_image || null, category: p.category ?? 'actualite', title: p.title ?? '' }} className="h-40" />
            <div className="space-y-3 p-5">
              <CategoryTag category={p.category ?? 'actualite'} />
              <h3 className="text-2xl leading-tight font-black">{p.title || 'Titre de la publication'}</h3>
              {p.excerpt && <p className="text-muted">{p.excerpt}</p>}
              <div className="max-h-[480px] overflow-y-auto border-t border-line pt-3 text-sm">{p.body ? <RichText text={p.body} /> : <p className="text-muted">Le texte apparaîtra ici.</p>}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
