import { LogIn, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { cx } from '../components/ui'
import { CONTACT_EMAIL } from './config'
import Article from './pages/Article'
import Download from './pages/Download'
import Home from './pages/Home'
import Privacy from './pages/Privacy'
import PublicationsList from './pages/PublicationsList'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const home = pathname === '/'
  const links = [
    { to: '/#application', label: "L'application" },
    { to: '/#fonctionnalites', label: 'Fonctionnalités' },
    { to: '/publications', label: 'Publications' },
    { to: '/#faq', label: 'FAQ' },
  ]
  return (
    <header className={cx('sticky top-0 z-40 transition', home ? 'bg-night/95 backdrop-blur' : 'bg-night')}>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Moon, accueil">
          <img src="/site/moon-mark.png" alt="" className="size-10 rounded-full bg-white p-1" />
          <span className="text-2xl font-black text-white">Moon</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="rounded-full px-3 py-2 text-sm font-bold text-white/85 hover:bg-white/10 hover:text-white">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Link to="/telecharger" className="rounded-full bg-pink px-4 py-2 text-sm font-extrabold text-white hover:bg-pink/90">
            Télécharger l'app
          </Link>
          <a href="/admin" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-extrabold text-white hover:bg-white/10">
            <LogIn className="size-4" /> Connexion équipe
          </a>
        </div>
        <button className="ml-auto text-white sm:ml-2 lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-4 pb-4 lg:hidden" aria-label="Menu">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-bold text-white hover:bg-white/10">
              {l.label}
            </Link>
          ))}
          <Link to="/telecharger" onClick={() => setOpen(false)} className="mt-2 block rounded-xl bg-pink px-3 py-3 text-center font-extrabold text-white">
            Télécharger l'app
          </Link>
          <a href="/admin" className="mt-2 block rounded-xl border border-white/30 px-3 py-3 text-center font-extrabold text-white">
            Connexion équipe
          </a>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-night text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <img src="/site/moon-mark.png" alt="" className="size-10 rounded-full bg-white p-1" />
            <span className="text-2xl font-black">Moon</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-white/75">Sensibilisation et accompagnement des jeunes sur l'hygiène menstruelle. Gratuit, confidentiel, sans tabou.</p>
          <div className="mt-5 inline-flex flex-wrap items-center gap-4 rounded-2xl bg-white px-4 py-3">
            <img src="/site/mjs.png" alt="Ministère de la Jeunesse et des Sports" className="h-9" />
            <img src="/site/unfpa.png" alt="UNFPA" className="h-9" />
            <img src="/site/dpsj.png" alt="Direction de la Protection Sociale des Jeunes" className="h-9" />
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-black tracking-wider text-white/60 uppercase">Moon</h2>
          <ul className="space-y-2 text-sm font-bold">
            <li><Link to="/#application" className="hover:text-gold">L'application</Link></li>
            <li><Link to="/publications" className="hover:text-gold">Publications</Link></li>
            <li><Link to="/telecharger" className="hover:text-gold">Télécharger</Link></li>
            <li><Link to="/confidentialite" className="hover:text-gold">Confidentialité</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-black tracking-wider text-white/60 uppercase">Contact</h2>
          <p className="text-sm text-white/80 select-all">{CONTACT_EMAIL}</p>
          <a href="/admin" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-extrabold hover:bg-white/10">
            <LogIn className="size-4" /> Connexion équipe
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60 md:px-6">
          Moon informe et sensibilise ; l'application ne remplace pas un avis médical. En cas d'urgence, appelle immédiatement les secours. © {new Date().getFullYear()} Moon
        </p>
      </div>
    </footer>
  )
}

export default function SiteApp() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="flex min-h-full flex-col bg-[#fbf8ff]">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route index element={<Home />} />
            <Route path="publications" element={<PublicationsList />} />
            <Route path="publications/:slug" element={<Article />} />
            <Route path="confidentialite" element={<Privacy />} />
            <Route path="telecharger" element={<Download />} />
            <Route path="connexion" element={<GoToAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

function GoToAdmin() {
  useEffect(() => {
    window.location.replace('/admin')
  }, [])
  return null
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <img src="/site/moon-mark.png" alt="" className="mx-auto size-24" />
      <h1 className="mt-6 text-3xl font-black">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-pink px-5 py-3 font-extrabold text-white">
        Revenir à l'accueil
      </Link>
    </div>
  )
}
