import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Checkbox, ErrorState, Field, Input, Loading, Notice, PhoneFrame, Select, Textarea, cx } from '../../components/ui'
import { api, ApiError, errorMessage } from '../../lib/api'
import { fmtDate } from '../../lib/format'
import { useApi } from '../../lib/hooks'
import { TYPES, type Center } from './Centers'

const DAYS: [string, string][] = [
  ['mon', 'Lundi'],
  ['tue', 'Mardi'],
  ['wed', 'Mercredi'],
  ['thu', 'Jeudi'],
  ['fri', 'Vendredi'],
  ['sat', 'Samedi'],
  ['sun', 'Dimanche'],
]
const SERVICES: Record<string, string> = { ecoute: 'Écoute et conseils', consultation: 'Consultation médicale', protections: 'Protections hygiéniques', planification: 'Planification familiale', infos: 'Infos règles et santé', orientation: 'Orientation' }
const STEPS = ['Informations', 'Position', 'Horaires et services', 'Vérification']

const empty: Partial<Center> = { name: '', type: 'youth_center', description: '', opening_hours: { mon: ['08:00', '17:00'], tue: ['08:00', '17:00'], wed: ['08:00', '17:00'], thu: ['08:00', '17:00'], fri: ['08:00', '17:00'] }, services: [], languages: ['fr'], is_free: true, is_confidential: true, is_accessible: false, walk_in: false, audience: 'all', is_active: false, position_confirmed: false }

export default function CenterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const existing = useApi<Center>(isNew ? null : `/admin/resources/${id}`)
  const [c, setC] = useState<Partial<Center>>(empty)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [msg, setMsg] = useState<{ tone: 'mint' | 'danger'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing.data) setC(existing.data)
  }, [existing.data])
  const set = (p: Partial<Center>) => setC((cur) => ({ ...cur, ...p }))

  const save = async (extra: Partial<Center> = {}, next?: number) => {
    setSaving(true)
    setErrors({})
    setMsg(null)
    try {
      const body = { ...c, ...extra, latitude: c.latitude ?? null, longitude: c.longitude ?? null }
      const saved = await api<Center>(c.id ? `/admin/resources/${c.id}` : '/admin/resources', { method: c.id ? 'PATCH' : 'POST', body })
      setC(saved)
      if (!c.id) navigate(`/centres/${saved.id}`, { replace: true })
      setMsg({ tone: 'mint', text: extra.is_active ? 'Centre publié : il est visible dans l\'app.' : 'Enregistré.' })
      if (next !== undefined) setStep(next)
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors)
      setMsg({ tone: 'danger', text: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  if (existing.loading) return <Loading />
  if (existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />
  const err = (k: string) => errors[k]?.[0]
  const hours = c.opening_hours ?? {}
  const checks = [
    { ok: !!c.name && !!c.type && !!c.description, label: 'Informations complètes' },
    { ok: !!c.latitude && !!c.position_confirmed, label: 'Position confirmée' },
    { ok: Object.keys(hours).length > 0, label: 'Horaires renseignés' },
    { ok: !!c.phone, label: "Bouton d'appel" },
    { ok: !!c.verified_at, label: 'Informations vérifiées' },
  ]

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/centres" className="flex items-center gap-1 font-bold text-muted hover:text-night">
          <ArrowLeft className="size-4" /> Retour
        </Link>
        <h1 className="text-xl font-black">{isNew ? 'Nouveau centre' : c.name}</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => save()} loading={saving}>
            Enregistrer
          </Button>
          {step < 3 && (
            <Button icon={<ArrowRight className="size-4" />} onClick={() => save({}, step + 1)}>
              Suivant
            </Button>
          )}
        </div>
      </div>
      <ol className="mb-5 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button onClick={() => setStep(i)} className={cx('rounded-full px-4 py-1.5 text-sm font-extrabold', step === i ? 'bg-pink text-white' : 'bg-white text-muted')}>
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="space-y-4">
          {step === 0 && (
            <>
              <Field label="Nom du centre" required error={err('name')}>
                <Input value={c.name ?? ''} onChange={(e) => set({ name: e.target.value })} placeholder="Centre de conseils pour adolescents de Dakar" />
              </Field>
              <Field group label="Type" required>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TYPES)
                    .filter(([k]) => k !== 'hotline')
                    .map(([k, t]) => (
                      <Button key={k} size="sm" variant={c.type === k ? 'pink' : 'outline'} onClick={() => set({ type: k })}>
                        {t.icon} {t.label}
                      </Button>
                    ))}
                </div>
              </Field>
              <Field label="Description courte" required hint={`${(c.description ?? '').length}/200 · Sois clair sur les services proposés.`} error={err('description')}>
                <Textarea maxLength={200} value={c.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="Un espace d'écoute et de conseils pour les jeunes." />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Téléphone" error={err('phone')}>
                  <Input value={c.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} placeholder="77 123 45 67" />
                </Field>
                <Field label="Adresse courte">
                  <Input value={c.address ?? ''} onChange={(e) => set({ address: e.target.value })} placeholder="Marché de Pikine" />
                </Field>
                <Field label="Quartier">
                  <Input value={c.neighborhood ?? ''} onChange={(e) => set({ neighborhood: e.target.value })} />
                </Field>
                <Field label="Ville">
                  <Input value={c.city ?? ''} onChange={(e) => set({ city: e.target.value })} />
                </Field>
                <Field label="Région">
                  <Input value={c.region ?? ''} onChange={(e) => set({ region: e.target.value })} />
                </Field>
                <Field label="Public">
                  <Select value={c.audience ?? 'all'} onChange={(e) => set({ audience: e.target.value })}>
                    <option value="all">Filles et garçons</option>
                    <option value="girls">Filles</option>
                  </Select>
                </Field>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Latitude" required error={err('latitude')}>
                  <Input type="number" step="0.0001" value={c.latitude ?? ''} onChange={(e) => set({ latitude: e.target.value ? Number(e.target.value) : null, position_confirmed: false })} placeholder="14.7645" />
                </Field>
                <Field label="Longitude" required error={err('longitude')}>
                  <Input type="number" step="0.0001" value={c.longitude ?? ''} onChange={(e) => set({ longitude: e.target.value ? Number(e.target.value) : null, position_confirmed: false })} placeholder="-17.3660" />
                </Field>
              </div>
              <p className="text-xs text-muted">Astuce : dans Google Maps, fais un clic droit sur le centre pour copier ses coordonnées.</p>
              {c.latitude && c.longitude ? (
                <>
                  <iframe
                    title="Position du centre"
                    className="h-72 w-full rounded-2xl border border-line"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${c.longitude - 0.01},${c.latitude - 0.006},${c.longitude + 0.01},${c.latitude + 0.006}&layer=mapnik&marker=${c.latitude},${c.longitude}`}
                  />
                  <Checkbox checked={!!c.position_confirmed} onChange={(v) => set({ position_confirmed: v })} label="Je confirme que le repère est bien placé sur le centre" />
                </>
              ) : (
                <Notice tone="gold">Renseigne les coordonnées pour afficher la carte.</Notice>
              )}
            </>
          )}
          {step === 2 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-black">Horaires d'ouverture</h3>
                <div className="space-y-2">
                  {DAYS.map(([k, label]) => {
                    const slot = hours[k]
                    return (
                      <div key={k} className="flex items-center gap-2 text-sm">
                        <span className="w-20 font-bold">{label}</span>
                        {slot ? (
                          <>
                            <Input type="time" value={slot[0]} onChange={(e) => set({ opening_hours: { ...hours, [k]: [e.target.value, slot[1]] } })} className="w-28 py-1" />
                            <span>–</span>
                            <Input type="time" value={slot[1]} onChange={(e) => set({ opening_hours: { ...hours, [k]: [slot[0], e.target.value] } })} className="w-28 py-1" />
                            <button
                              onClick={() => {
                                const h = { ...hours }
                                delete h[k]
                                set({ opening_hours: h })
                              }}
                              className="p-1 text-danger"
                              aria-label={`Fermé le ${label}`}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" icon={<Plus className="size-3" />} onClick={() => set({ opening_hours: { ...hours, [k]: ['08:00', '17:00'] } })}>
                            Ajouter un horaire
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 font-black">Services proposés</h3>
                  {Object.entries(SERVICES).map(([k, l]) => (
                    <div key={k} className="mb-1">
                      <Checkbox checked={(c.services ?? []).includes(k)} onChange={(v) => set({ services: v ? [...(c.services ?? []), k] : (c.services ?? []).filter((x) => x !== k) })} label={l} />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <h3 className="mb-2 font-black">Accueil</h3>
                  <Checkbox checked={!!c.is_free} onChange={(v) => set({ is_free: v })} label="Gratuit" />
                  <br />
                  <Checkbox checked={!!c.is_confidential} onChange={(v) => set({ is_confidential: v })} label="Confidentiel" />
                  <br />
                  <Checkbox checked={!!c.walk_in} onChange={(v) => set({ walk_in: v })} label="Sans rendez-vous" />
                  <br />
                  <Checkbox checked={!!c.is_accessible} onChange={(v) => set({ is_accessible: v })} label="Accessible (fauteuil roulant)" />
                </div>
                <div className="space-y-1">
                  <h3 className="mb-2 font-black">Langues</h3>
                  {[
                    ['fr', 'Français'],
                    ['wo', 'Wolof'],
                  ].map(([k, l]) => (
                    <div key={k}>
                      <Checkbox checked={(c.languages ?? []).includes(k)} onChange={(v) => set({ languages: v ? [...(c.languages ?? []), k] : (c.languages ?? []).filter((x) => x !== k) })} label={l} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-6 md:grid-cols-2">
              <ul className="space-y-3">
                {checks.map((ch) => (
                  <li key={ch.label} className="flex items-center gap-2 font-bold">
                    {ch.ok ? <CheckCircle2 className="size-5 text-mint" /> : <Circle className="size-5 text-line" />}
                    {ch.label}
                  </li>
                ))}
                <li className="pt-2">
                  <Button size="sm" variant="soft" onClick={() => save({ verified_at: new Date().toISOString().slice(0, 10) })}>
                    {c.verified_at ? `Vérifié le ${fmtDate(c.verified_at)} · revérifier aujourd'hui` : "Marquer comme vérifié aujourd'hui"}
                  </Button>
                </li>
              </ul>
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gold-soft p-5 text-center">
                <div className="text-4xl">🛡️</div>
                <p className="font-bold">{c.is_active ? 'Ce centre est visible dans l\'app.' : 'Ce centre sera visible après publication.'}</p>
                <div className="flex gap-2">
                  {c.is_active ? (
                    <Button variant="outline" onClick={() => save({ is_active: false })}>
                      Retirer de l'app
                    </Button>
                  ) : (
                    <Button disabled={!checks[0].ok || !c.id} onClick={() => save({ is_active: true })}>
                      Publier
                    </Button>
                  )}
                </div>
                {!checks[1].ok && <p className="text-xs text-muted">Sans position confirmée, le centre n'apparaîtra pas sur la carte (seulement dans la liste).</p>}
              </div>
            </div>
          )}
        </Card>

        <div>
          <h3 className="mb-2 text-center font-black">Aperçu — comme dans l'app</h3>
          <PhoneFrame>
            <div className="mt-4 rounded-2xl bg-white p-4 text-center shadow">
              <div className="text-3xl">{TYPES[c.type ?? 'youth_center']?.icon}</div>
              <div className="mt-1 font-black">{c.name || 'Nom du centre'}</div>
              <div className="mt-1 text-xs text-muted">{c.description || 'Description courte…'}</div>
              {c.phone && <div className="mt-3 rounded-full bg-night py-1.5 text-xs font-black text-white">📞 Appeler</div>}
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {c.is_free && <span className="rounded-full bg-pink-soft px-2 text-[10px] font-bold text-pink">Gratuit</span>}
                {c.is_confidential && <span className="rounded-full bg-pink-soft px-2 text-[10px] font-bold text-pink">Confidentiel</span>}
              </div>
            </div>
          </PhoneFrame>
          {c.id && (
            <Button
              variant="ghost"
              className="mt-4 w-full text-danger"
              onClick={async () => {
                if (confirm('Supprimer ce centre ? Préfère « Retirer de l\'app » si le centre est seulement fermé.')) {
                  await api(`/admin/resources/${c.id}`, { method: 'DELETE' })
                  navigate('/centres')
                }
              }}
            >
              Supprimer le centre
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
