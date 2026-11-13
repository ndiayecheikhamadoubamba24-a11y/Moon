import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
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
import Login from './pages/Login'
import ModuleEditor from './pages/modules/ModuleEditor'
import Modules from './pages/modules/Modules'
import Reports from './pages/Reports'
import TipsFaq from './pages/TipsFaq'
import UserDetail from './pages/users/UserDetail'
import Users from './pages/users/Users'

function Routed() {
  const { staff, ready } = useAuth()
  if (!ready) return <Loading />
  if (!staff) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="modules" element={<Modules />} />
        <Route path="modules/:id" element={<ModuleEditor />} />
        <Route path="jeux" element={<Games />} />
        <Route path="jeux/questions/:id" element={<QuestionEditor />} />
        <Route path="jeux/questions/:id/stats" element={<QuestionStats />} />
        <Route path="jeux/defis/:id" element={<ChallengeEditor />} />
        <Route path="conseils" element={<TipsFaq />} />
        <Route path="demandes" element={<HelpQueue />} />
        <Route path="demandes/:id" element={<HelpThread />} />
        <Route path="centres" element={<Centers />} />
        <Route path="centres/:id" element={<CenterEditor />} />
        <Route path="signalements" element={<Reports />} />
        <Route path="utilisateurs" element={<Users />} />
        <Route path="utilisateurs/:id" element={<UserDetail />} />
        <Route path="annonces" element={<Announcements />} />
        <Route path="administration" element={<Administration />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routed />
      </BrowserRouter>
    </AuthProvider>
  )
}
