import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Lock, SearchX, X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'pink' | 'night' | 'outline' | 'ghost' | 'soft' | 'danger'
const variants: Record<Variant, string> = {
  pink: 'bg-pink text-white hover:bg-pink/90',
  night: 'bg-night text-white hover:bg-night-soft',
  outline: 'border border-line bg-white text-night hover:bg-lavender-soft',
  ghost: 'text-purple hover:bg-lavender-soft',
  soft: 'bg-lavender text-night hover:bg-lilac',
  danger: 'bg-danger text-white hover:bg-danger/90',
}

export function Button({ variant = 'pink', size = 'md', loading, icon, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variants[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-2xl border border-line bg-white p-5 shadow-[0_4px_16px_rgba(43,24,88,0.05)]', className)}>{children}</div>
}

export function StatCard({ icon, label, value, tone = 'lavender', hint, onClick, active }: { icon: ReactNode; label: string; value: ReactNode; tone?: 'lavender' | 'pink' | 'gold' | 'mint' | 'danger'; hint?: string; onClick?: () => void; active?: boolean }) {
  const tones = { lavender: 'bg-lavender-soft', pink: 'bg-pink-soft', gold: 'bg-gold-soft', mint: 'bg-mint-soft', danger: 'bg-danger-soft' }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('flex flex-col items-center justify-center gap-1 rounded-2xl p-4 text-center', tones[tone], onClick && 'cursor-pointer hover:ring-2 hover:ring-lilac', active && 'ring-2 ring-purple')}>
      <div className="text-2xl">{icon}</div>
      <div className="text-sm font-bold text-night">{label}</div>
      <div className="text-3xl font-black text-night">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </Tag>
  )
}

export function Pill({ children, tone = 'lavender', className }: { children: ReactNode; tone?: 'lavender' | 'pink' | 'gold' | 'mint' | 'danger' | 'gray' | 'night'; className?: string }) {
  const tones = {
    lavender: 'bg-lavender text-purple',
    pink: 'bg-pink-soft text-pink',
    gold: 'bg-gold-soft text-[#b07215]',
    mint: 'bg-mint-soft text-mint',
    danger: 'bg-danger-soft text-danger',
    gray: 'bg-gray-100 text-gray-600',
    night: 'bg-night text-white',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', tones[tone], className)}>{children}</span>
}

export function Field({ label, required, hint, error, children, group }: { label: string; required?: boolean; hint?: string; error?: string; children: ReactNode; group?: boolean }) {
  const title = (
    <span className="mb-1 block text-sm font-bold text-night">
      {label}
      {required && <span className="text-pink"> *</span>}
    </span>
  )
  const extra = (
    <>
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-danger">{error}</span>}
    </>
  )
  // group : plusieurs contrôles (boutons, cases, radios) → <fieldset> plutôt qu'un <label>
  if (group)
    return (
      <fieldset>
        <legend className="contents">{title}</legend>
        {children}
        {extra}
      </fieldset>
    )
  return (
    <label className="block">
      {title}
      {children}
      {extra}
    </label>
  )
}

const width = (c?: string) => (c?.includes('w-auto') ? '' : 'w-full')
const inputCls = 'rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-night placeholder:text-muted/70 focus:border-purple focus:outline-none'
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, width(p.className), p.className)} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, 'min-h-24 w-full', p.className)} />
export const Select = ({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputCls, width(p.className), 'pr-8', p.className)}>
    {children}
  </select>
)

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded accent-purple" />
      {label}
    </label>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-night' : 'bg-line')}>
      <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition', checked ? 'left-5.5' : 'left-0.5')} />
    </button>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-line bg-white p-1">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} className={cx('rounded-full px-4 py-1.5 text-sm font-extrabold transition', value === t.value ? 'bg-pink text-white' : 'text-night hover:bg-lavender-soft')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className={cx('max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1 hover:bg-lavender-soft">
            <X className="size-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-night/30" onMouseDown={onClose}>
      <aside onMouseDown={(e) => e.stopPropagation()} className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="text-lg font-black">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1 hover:bg-lavender-soft">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line p-5">{footer}</div>}
      </aside>
    </div>
  )
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-lavender-soft text-xs font-extrabold text-night">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <EmptyState title="Aucun résultat" text="Modifie les filtres ou la recherche." />}
    </div>
  )
}

export function Pagination({ page, last, onChange, total, from, to }: { page: number; last: number; onChange: (p: number) => void; total?: number; from?: number | null; to?: number | null }) {
  if (last <= 1 && !total) return null
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted">
      <span>{total !== undefined && from ? `Affichage ${from}-${to} sur ${total}` : ''}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-full p-1.5 hover:bg-lavender disabled:opacity-30" aria-label="Page précédente">
          <ChevronLeft className="size-4" />
        </button>
        {Array.from({ length: Math.min(last, 5) }, (_, i) => i + Math.max(1, Math.min(page - 2, last - 4))).map((p) => (
          <button key={p} onClick={() => onChange(p)} className={cx('size-8 rounded-lg font-bold', p === page ? 'bg-night text-white' : 'hover:bg-lavender')}>
            {p}
          </button>
        ))}
        <button disabled={page >= last} onClick={() => onChange(page + 1)} className="rounded-full p-1.5 hover:bg-lavender disabled:opacity-30" aria-label="Page suivante">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <div className="text-purple">{icon ?? <SearchX className="size-10" />}</div>
      <p className="font-black">{title}</p>
      {text && <p className="text-sm text-muted">{text}</p>}
      {action}
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-muted">
      <Loader2 className="size-8 animate-spin text-purple" />
      Chargement…
    </div>
  )
}

export function ErrorState({ message, onRetry, forbidden }: { message: string; onRetry?: () => void; forbidden?: boolean }) {
  if (forbidden)
    return <EmptyState icon={<Lock className="size-10" />} title="Accès limité" text="Tu n'as pas les droits requis pour cette page." />
  return (
    <EmptyState
      icon={<AlertTriangle className="size-10 text-danger" />}
      title="Erreur de chargement"
      text={message}
      action={
        onRetry && (
          <Button variant="pink" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        )
      }
    />
  )
}

export function Notice({ tone = 'lavender', children, icon }: { tone?: 'lavender' | 'gold' | 'danger' | 'mint'; children: ReactNode; icon?: ReactNode }) {
  const tones = { lavender: 'bg-lavender-soft text-night', gold: 'bg-gold-soft text-night', danger: 'bg-danger-soft text-danger', mint: 'bg-mint-soft text-night' }
  return <div className={cx('flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold', tones[tone])}>{icon}{children}</div>
}

export function PageHeader({ icon, title, crumbs, actions }: { icon?: ReactNode; title: string; crumbs?: string[]; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {crumbs && <div className="mb-1 text-xs font-bold text-muted">{['Moon', ...crumbs].join('  ›  ')}</div>}
        <h1 className="flex items-center gap-3 text-2xl font-black">
          {icon}
          {title}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

/** Cadre de téléphone pour les aperçus « comme dans l'app ». */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-64 rounded-[2.2rem] border-[6px] border-night bg-night p-1 shadow-xl">
      <div className="flex items-center justify-between px-4 py-1 text-[10px] font-bold text-white">
        <span>9:41</span>
        <span>🌙 Moon</span>
      </div>
      <div className="min-h-[420px] overflow-hidden rounded-[1.6rem] bg-[#fbf8ff] p-3">{children}</div>
    </div>
  )
}

export function useConfirm() {
  return (message: string) => window.confirm(message)
}
