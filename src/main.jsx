import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// The Build 21 anon connection check that used to run here was removed in
// Build 25: once real RLS policies require `to authenticated`, an anon
// (signed-out) query is SUPPOSED to fail, so the old console check would
// permanently report a false alarm. Auth state is now verified inside
// App() itself (see the session/authLoading logic there) instead.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
