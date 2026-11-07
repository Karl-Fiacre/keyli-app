import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/dashboard-animations.css'
import App from './App.tsx'
import { installerJournalGlobal } from '@/lib/journal'

// Journal des erreurs inattendues (Sprint 6)
installerJournalGlobal()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
