import React from 'react'
import ReactDOM from 'react-dom/client'
import { MultiSessionApp } from './MultiSessionApp.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MultiSessionApp />
  </React.StrictMode>,
)