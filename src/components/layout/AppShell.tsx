import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ReminderScheduler } from '@/app/ReminderScheduler'
import { NAV_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'

function documentTitle(pathname: string) {
  if (pathname.startsWith('/subjects/')) return 'My Subjects'
  const item = NAV_ITEMS.find((nav) =>
    nav.to === '/' ? pathname === '/' : pathname === nav.to || pathname.startsWith(`${nav.to}/`),
  )
  return item?.label ?? 'Student Hub'
}

export function AppShell() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = `${documentTitle(location.pathname)} · Student Hub`
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div
        className={cn(
          'min-h-screen transition-[padding] duration-200',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[252px]',
        )}
      >
        <Topbar />
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={{ y: 6 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </motion.div>
          <footer className="mt-12 flex items-center justify-between border-t border-border pt-5 text-[10px] text-muted-2">
            <span>Student Hub · Data tersimpan lokal di perangkat ini.</span>
            <span className="hidden sm:inline">Local-first · IndexedDB</span>
          </footer>
        </main>
      </div>
      <ReminderScheduler />
    </div>
  )
}
