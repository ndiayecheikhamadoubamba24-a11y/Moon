import { ExternalLink, Newspaper, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, ErrorState, Input, Loading, PageHeader, Pagination, Pill, Select, Table } from '../../components/ui'
import { qs, type Paginated } from '../../lib/api'
import { fmtDate, fmtNum } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { CATEGORIES } from '../../site/config'

export type Publication = {
  id: number
  title: string
  slug: string
  category: string
  excerpt: string | null
  body: string
  cover_image: string | null
  status: 'draft' | 'published'
  featured: boolean
  published_at: string | null
  views_count: number
  updated_at: string
  author: { name: string } | null
}

export function publicationState(p: Pick<Publication, 'status' | 'published_at'>): { label: string; tone: 'gray' | 'lavender' | 'mint' } {
  if (p.status !== 'published') return { label: 'Brouillon', tone: 'gray' }
  if (p.published_at && new Date(p.published_at) > new Date()) return { label: 'Programmée', tone: 'lavender' }
  return { label: 'En ligne', tone: 'mint' }
}

export default function Publications() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const list = useApi<Paginated<Publication>>(`/admin/publications${qs({ q, category, status, page })}`)

  return (
    <>
      <PageHeader
        icon={<Newspaper className="text-pink" />}
        title="Publications du site"
        crumbs={['Publications du site']}
        actions={
          <>
            <a href="/publications" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" icon={<ExternalLink className="size-4" />}>
                Voir sur le site
              </Button>
            </a>
            <Button icon={<Plus className="size-4" />} onClick={() => navigate('/publications/new')}>
              Nouvelle publication
            </Button>
          </>
        }
      />
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input placeholder="Rechercher une publication…" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} className="max-w-xs" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
            <option value="">Catégorie</option>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="">Statut</option>
            <option value="published">Publiée</option>
            <option value="draft">Brouillon</option>
          </Select>
        </div>
        {list.loading && !list.data ? (
          <Loading />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} forbidden={list.forbidden} />
        ) : !list.data?.data.length ? (
          <EmptyState icon={<span className="text-5xl">📰</span>} title="Aucune publication" text="Les publications apparaissent sur le site public, rubrique Publications." action={<Button size="sm" onClick={() => navigate('/publications/new')}>Écrire la première</Button>} />
        ) : (
          <Table head={['Titre', 'Catégorie', 'Statut', 'Date de publication', 'Lectures', 'Auteur', 'Modifiée le']}>
            {list.data.data.map((p) => {
              const st = publicationState(p)
              return (
                <tr key={p.id} className="hover:bg-lavender-soft/50">
                  <td className="max-w-md px-3 py-2.5">
                    <Link to={`/publications/${p.id}`} className="flex items-center gap-2 font-extrabold hover:text-pink">
                      {p.featured && <Star className="size-4 shrink-0 fill-gold text-gold" aria-label="À la une" />}
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{CATEGORIES[p.category]?.label}</td>
                  <td className="px-3 py-2.5">
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </td>
                  <td className="px-3 py-2.5">{fmtDate(p.published_at)}</td>
                  <td className="px-3 py-2.5">{fmtNum(p.views_count)}</td>
                  <td className="px-3 py-2.5">{p.author?.name ?? '—'}</td>
                  <td className="px-3 py-2.5">{fmtDate(p.updated_at)}</td>
                </tr>
              )
            })}
          </Table>
        )}
        {list.data && <Pagination page={list.data.current_page} last={list.data.last_page} total={list.data.total} from={list.data.from} to={list.data.to} onChange={setPage} />}
      </Card>
    </>
  )
}
