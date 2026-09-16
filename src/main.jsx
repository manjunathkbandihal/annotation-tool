import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { testConnection } from './supabaseClient.js'

// Build 21 connection check — logs to the browser console only, doesn't
// affect the UI or app state. Safe to remove once you've confirmed it
// once; Build 22 will replace this with real data loading.
testConnection();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
