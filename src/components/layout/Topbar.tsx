import { Menu, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { useTheme } from '@/app/ThemeProvider'
import { NAV_ITEMS } from '@/lib/constants'
import { useUIStore } from '@/stores/ui-store'

function currentLabel(pathname: string) {
  if (pathname.startsWith('/subjects/')) return 'My Subjects'
  const item = NAV_ITEMS.find((nav) =>
    nav.to === '/' ? pathname === '/' : pathname === nav.to || pathname.startsWith(`${nav.to}/`),
  )
  return item?.label ?? 'Student Hub'
}

export function Topbar() {
  const location = useLocation()
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen)
  const { resolved, setMode } = useTheme()
  const label = currentLabel(location.pathname)

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Buka menu navigasi"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink lg:hidden"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
              Student Hub
            </p>
            <p className="truncate text-sm font-bold tracking-tight text-ink">{label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
            aria-label={resolved === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            title={resolved === 'dark' ? 'Mode terang' : 'Mode gelap'}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            {resolved === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
