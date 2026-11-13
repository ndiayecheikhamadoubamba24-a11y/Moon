import { Megaphone, Send } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Checkbox, ErrorState, Field, Input, Loading, Notice, PageHeader, Pill, Select, Table, Textarea } from '../components/ui'
import { api, errorMessage, type Paginated } from '../lib/api'
import { fmtDateTime } from '../lib/format'
import { useApi } from '../lib/hooks'

type Ann = { id: number; title: string; body: string; audience: { age_range?: string[]; language?: string } | null; scheduled_at: string | null; sent_at: string | null; recipients_count: number; created_at: string }
const AGES = ['12-14', '15-17', '18-21', '22-25', '25+']

export default function Announcements() {
  const { data, loading, error, reload } = useApi<Paginated<Ann>>('/admin/announcements')
  const [f, setF] = useState({ title: '', body: '', ages: [] as string[], language: '', scheduled_at: '' })
  const [msg, setMsg] = useState<{ tone: 'mint' | 'danger'; text: string } | null>(null)

  const create = async (sendNow: boolean) => {
    try {
      const a = await api<Ann>('/admin/announcements', {
        method: 'POST',
        body: { title: f.title, body: f.body, push: true, audience: { age_range: f.ages.length ? f.ages : undefined, language: f.language || undefined }, scheduled_at: !sendNow && f.scheduled_at ? new Date(f.scheduled_at).toISOString() : null },
      })
      if (sendNow) await api(`/admin/announcements/${a.id}/send`, { method: 'POST' })
      setF({ title: '', body: '', ages: [], language: '', scheduled_at: '' })
      setMsg({ tone: 'mint', text: sendNow ? 'Annonce envoyée.' : 'Annonce programmée.' })
      reload()
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) })
    }
  }

  return (
    <>
      <PageHeader icon={<Megaphone className="text-pink" />} title="Annonces et notifications" crumbs={['Annonces']} />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="space-y-3">
          <h2 className="font-black">Nouvelle annonce</h2>
          <Field label="Titre" required hint={`${f.title.length}/100`}>
            <Input maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Nouveau module disponible 🌙" />
          </Field>
          <Field label="Message" required hint="Reste discrète : pas de mot sensible, la notification s'affiche sur l'écran verrouillé.">
            <Textarea maxLength={300} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          </Field>
          <Field group label="Tranches d'âge (vide = toutes)">
            <div className="flex flex-wrap gap-3">
              {AGES.map((a) => (
                <Checkbox key={a} checked={f.ages.includes(a)} onChange={(v) => setF({ ...f, ages: v ? [...f.ages, a] : f.ages.filter((x) => x !== a) })} label={a} />
              ))}
            </div>
          </Field>
          <Field label="Langue">
            <Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>
              <option value="">Toutes</option>
              <option value="fr">Français</option>
              <option value="wo">Wolof</option>
            </Select>
          </Field>
          <Field label="Programmer (facultatif)">
            <Input type="datetime-local" value={f.scheduled_at} onChange={(e) => setF({ ...f, scheduled_at: e.target.value })} />
          </Field>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={!f.title || !f.body || !f.scheduled_at} onClick={() => create(false)}>
              Programmer
            </Button>
            <Button className="flex-1" icon={<Send className="size-4" />} disabled={!f.title || !f.body} onClick={() => create(true)}>
              Envoyer maintenant
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-black">Historique</h2>
          {loading && !data ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <Table empty={!data?.data.length} head={['Annonce', 'Public', 'Statut', 'Destinataires']}>
              {data?.data.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2.5">
                    <div className="font-bold">{a.title}</div>
                    <div className="text-xs text-muted">{a.body}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{a.audience?.age_range?.join(', ') ?? 'Toutes'}</td>
                  <td className="px-3 py-2.5">{a.sent_at ? <Pill tone="mint">Envoyée {fmtDateTime(a.sent_at)}</Pill> : <Pill tone="gold">Programmée {fmtDateTime(a.scheduled_at)}</Pill>}</td>
                  <td className="px-3 py-2.5">{a.recipients_count}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
