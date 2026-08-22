import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { LobbyPage } from './pages/LobbyPage'
import { JoinPage } from './pages/JoinPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:lobbyId" element={<LobbyPage />} />
        <Route path="/join/:inviteCode" element={<JoinPage />} />
      </Routes>
    </AppShell>
  )
}
