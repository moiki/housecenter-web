import '@/bootstrap'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { AppThemeProvider } from '@/components/shared/AppThemeProvider'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <ErrorBoundary label="app root">
        <App />
      </ErrorBoundary>
    </AppThemeProvider>
  </StrictMode>,
)
