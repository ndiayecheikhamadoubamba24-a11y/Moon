import { BookOpen, Flag, Gamepad2, HeartHandshake, LayoutDashboard, LogOut, MapPin, Megaphone, Menu, MessageCircleQuestion, Settings, Users, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ROLE_LABELS, useAuth } from '../lib/auth'
import { useApi } from '../lib/hooks'
import { cx } from './ui'

export function MoonLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M40 6a26 26 0 1 0 18 44A22 22 0 0 1 40 6z" fill="#F5B85C" />
    </svg>
  )
}

type Item = { to: string; label: string; icon: ReactNode; roles?: string[]; badge?: number }

export function Layout() {
  const { staff, logout, can } = useAuth()
  const [open, setOpen] = useState(false)
  const { data: dash } = useApi<{ help_requests: { open: number }; reports_open: number }>('/admin/dashboard')

  const items: Item[] = [
    { to: '/', label: 'Tableau de bord', icon: <LayoutDashboard className="size-5" /> },
    { to: '/modules', label: 'Modules', icon: <BookOpen className="size-5" />, roles: ['educator'] },
    { to: '/jeux', label: 'Jeux et défis', icon: <Gamepad2 className="size-5" />, roles: ['educator'] },
    { to: '/conseils', label: 'Conseils et FAQ', icon: <MessageCircleQuestion className="size-5" />, roles: ['educator'] },
    { to: '/demandes', label: "Demandes d'aide", icon: <HeartHandshake className="size-5" />, roles: ['support'], badge: dash?.help_requests.open },
    { to: '/centres', label: 'Centres et contacts', icon: <MapPin className="size-5" />, roles: ['support'] },
    { to: '/signalements', label: 'Signalements', icon: <Flag className="size-5" />, roles: ['moderator'], badge: dash?.reports_open },
    { to: '/utilisateurs', label: 'Utilisateurs', icon: <Users className="size-5" />, roles: ['moderator'] },
    { to: '/annonces', label: 'Annonces', icon: <Megaphone className="size-5" />, roles: ['educator', 'support'] },
    { to: '/administration', label: 'Administration', icon: <Settings className="size-5" />, roles: ['super_admin'] },
  ]

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items
        .filter((i) => !i.roles || can(...i.roles))
        .map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition', isActive ? 'bg-pink text-white' : 'text-white/85 hover:bg-white/10')}
          >
            {i.icon}
            <span className="flex-1">{i.label}</span>
            {!!i.badge && <span className="rounded-full bg-pink px-2 text-xs font-black text-white">{i.badge}</span>}
          </NavLink>
        ))}
    </nav>
  )

  return (
    <div className="flex min-h-full">
      <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 bg-night p-4 transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center gap-2 px-2 pt-2">
          <MoonLogo />
          <span className="text-2xl font-black text-white">Moon</span>
          <button className="ml-auto text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X />
          </button>
        </div>
        {nav}
        <div className="rounded-2xl bg-white/10 p-3 text-white">
          <div className="font-extrabold">{staff?.name}</div>
          <div className="text-xs text-white/70">{staff && ROLE_LABELS[staff.role]}</div>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm font-bold text-white/85 hover:text-white">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-night/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu />
          </button>
          <MoonLogo size={28} />
          <span className="font-black">Moon</span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
