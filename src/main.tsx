import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from '@/App'
import '@/index.css'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { ToastViewport } from '@/app/ToastViewport'
import { ThemeProvider } from '@/app/ThemeProvider'
import { ClockProvider } from '@/hooks/useClock'
import { ensureDatabase } from '@/db'
import { createWelcomeNotification } from '@/db/seed'

async function bootstrap() {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Elemen #root tidak ditemukan.')

  try {
    await ensureDatabase()
    await createWelcomeNotification()
  } catch (error) {
    console.error('Gagal menyiapkan database lokal', error)
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <ThemeProvider>
            <ClockProvider>
              <App />
              <ToastViewport />
            </ClockProvider>
          </ThemeProvider>
        </HashRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}

void bootstrap()
