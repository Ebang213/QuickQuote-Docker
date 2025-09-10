import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Set document title from env if provided
const appName = import.meta.env?.VITE_APP_NAME || 'QuickQuote';
try { document.title = appName; } catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
