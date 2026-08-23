import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { LobbyPage } from './pages/LobbyPage'
import { JoinPage } from './pages/JoinPage'
import { SharedSummaryPage } from './pages/SharedSummaryPage'
import { LeaderboardPage } from './pages/LeaderboardPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:lobbyId" element={<LobbyPage />} />
        <Route path="/join/:inviteCode" element={<JoinPage />} />
        <Route path="/summary/:shareCode" element={<SharedSummaryPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </AppShell>
  )
}
