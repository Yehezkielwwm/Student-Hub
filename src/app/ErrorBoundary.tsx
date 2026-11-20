import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Student Hub error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-6">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 text-center shadow-card">
            <p className="text-sm font-bold text-ink">Terjadi kesalahan</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Student Hub gagal menampilkan halaman ini. Data lokalmu tetap tersimpan. Coba muat
              ulang aplikasi.
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-surface-2 p-3 text-left text-[10px] text-muted">
              {this.state.error.message}
            </pre>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Muat ulang
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
