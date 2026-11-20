import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  FolderClosed,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { useProfile } from '@/hooks/useProfile'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  schedule: CalendarDays,
  assignments: ListChecks,
  reminders: Bell,
  subjects: BookOpen,
  files: FolderClosed,
  analytics: BarChart3,
  settings: Settings,
}

function SidebarContent({ mobile = false }: { mobile?: boolean }) {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen)
  const profile = useProfile()
  const location = useLocation()
  const isCollapsed = mobile ? false : collapsed

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 items-center border-b border-border px-4',
          isCollapsed ? 'justify-center px-2' : 'justify-between',
        )}
      >
        <NavLink
          to="/"
          onClick={() => mobile && setMobileNavOpen(false)}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-[var(--accent-ink)] shadow-soft">
            <GraduationCap className="h-[18px] w-[18px]" />
          </span>
          {!isCollapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-ink">
                Student Hub
              </span>
              <span className="block truncate text-[10px] font-medium text-muted-2">
                Smart student dashboard
              </span>
            </span>
          ) : null}
        </NavLink>
        {!mobile ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Tutup menu"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
        {!isCollapsed ? (
          <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-2">
            Menu
          </p>
        ) : null}
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon]
          const active =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => mobile && setMobileNavOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'group relative flex h-10 items-center gap-3 rounded-xl px-2.5 text-[13px] font-semibold transition-all duration-150',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-surface-2 hover:text-ink',
                isCollapsed && 'justify-center px-0',
              )}
            >
              <Icon
                className={cn(
                  'h-[17px] w-[17px] shrink-0 transition-transform duration-150 group-hover:scale-105',
                  active ? 'text-accent' : 'text-muted',
                )}
              />
              {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
              {active && !isCollapsed ? (
                <motion.span
                  layoutId={mobile ? 'mobile-active-dot' : 'desktop-active-dot'}
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"
                />
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-border p-2.5">
        <NavLink
          to="/settings"
          onClick={() => mobile && setMobileNavOpen(false)}
          className={cn(
            'flex items-center gap-2.5 rounded-xl p-2 transition hover:bg-surface-2',
            isCollapsed && 'justify-center',
          )}
          title={isCollapsed ? 'Profil dan pengaturan' : undefined}
        >
          <Avatar name={profile?.name ?? 'Siswa'} assetId={profile?.avatarAssetId} size={34} />
          {!isCollapsed ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-ink">
                  {profile?.name ?? 'Siswa'}
                </span>
                <span className="block truncate text-[10px] text-muted">Profil & pengaturan</span>
              </span>
              <Settings className="h-3.5 w-3.5 text-muted-2" />
            </>
          ) : null}
        </NavLink>
      </div>
    </div>
  )
}

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const mobileNavOpen = useUIStore((state) => state.mobileNavOpen)
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen)

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-surface transition-[width] duration-200 lg:block',
          collapsed ? 'w-[76px]' : 'w-[252px]',
        )}
      >
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Tutup menu navigasi"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 left-0 w-[280px] border-r border-border bg-surface shadow-float"
            >
              <SidebarContent mobile />
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
