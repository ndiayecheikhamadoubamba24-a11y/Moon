import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import SiteApp from './site/SiteApp'
import { Loading } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import Administration from './pages/Administration'
import Announcements from './pages/Announcements'
import CenterEditor from './pages/centers/CenterEditor'
import Centers from './pages/centers/Centers'
import Dashboard from './pages/Dashboard'
import ChallengeEditor from './pages/games/ChallengeEditor'
import Games from './pages/games/Games'
import QuestionEditor from './pages/games/QuestionEditor'
import QuestionStats from './pages/games/QuestionStats'
import HelpQueue from './pages/help/HelpQueue'
import HelpThread from './pages/help/HelpThread'
import FirstPassword from './pages/ChangePassword'
import Login from './pages/Login'
import ModuleEditor from './pages/modules/ModuleEditor'
import Modules from './pages/modules/Modules'
import Publications from './pages/publications/Publications'
import PublicationEditor from './pages/publications/PublicationEditor'
import Reports from './pages/Reports'
import TipsFaq from './pages/TipsFaq'
import UserDetail from './pages/users/UserDetail'
import Users from './pages/users/Users'

/** Page réservée à certains postes : sinon retour au tableau de bord (l'API refuse aussi l'accès). */
function Allow({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { can } = useAuth()
  return can(...roles) ? children : <Navigate to="/" replace />
}

function Routed() {
  const { staff, ready } = useAuth()
  if (!ready) return <Loading />
  if (!staff) return <Login />
  if (staff.must_change_password) return <FirstPassword />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="modules" element={<Allow roles={['educator']}><Modules /></Allow>} />
        <Route path="modules/:id" element={<Allow roles={['educator']}><ModuleEditor /></Allow>} />
        <Route path="jeux" element={<Allow roles={['educator']}><Games /></Allow>} />
        <Route path="jeux/questions/:id" element={<Allow roles={['educator']}><QuestionEditor /></Allow>} />
        <Route path="jeux/questions/:id/stats" element={<Allow roles={['educator']}><QuestionStats /></Allow>} />
        <Route path="jeux/defis/:id" element={<Allow roles={['educator']}><ChallengeEditor /></Allow>} />
        <Route path="conseils" element={<Allow roles={['educator']}><TipsFaq /></Allow>} />
        <Route path="demandes" element={<Allow roles={['support']}><HelpQueue /></Allow>} />
        <Route path="demandes/:id" element={<Allow roles={['support']}><HelpThread /></Allow>} />
        <Route path="centres" element={<Allow roles={['support']}><Centers /></Allow>} />
        <Route path="centres/:id" element={<Allow roles={['support']}><CenterEditor /></Allow>} />
        <Route path="signalements" element={<Allow roles={['moderator']}><Reports /></Allow>} />
        <Route path="utilisateurs" element={<Allow roles={['moderator']}><Users /></Allow>} />
        <Route path="utilisateurs/:id" element={<Allow roles={['moderator']}><UserDetail /></Allow>} />
        <Route path="annonces" element={<Allow roles={['educator', 'support']}><Announcements /></Allow>} />
        <Route path="publications" element={<Allow roles={['educator', 'support']}><Publications /></Allow>} />
        <Route path="publications/:id" element={<Allow roles={['educator', 'support']}><PublicationEditor /></Allow>} />
        <Route path="administration" element={<Allow roles={['super_admin']}><Administration /></Allow>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  )
}

/** Back-office de l'équipe, servi sous /admin. */
function AdminApp() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/admin">
        <Routed />
      </BrowserRouter>
    </AuthProvider>
  )
}

/** /admin… = back-office ; tout le reste = site vitrine public. */
export default function App() {
  const isAdmin = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
  return isAdmin ? <AdminApp /> : <SiteApp />
}
