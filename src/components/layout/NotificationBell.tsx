import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellRing, CheckCheck, ChevronRight, Clock3, Info } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '@/db'
import { markAllNotificationsRead, markNotificationRead } from '@/services/notifications'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const notifications = useLiveQuery(
    () => db.notifications.orderBy('createdAt').reverse().limit(8).toArray(),
    [],
  )
  const unread = (notifications ?? []).filter((notification) => !notification.read).length

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleOpenNotification(id: string, kind: string, assignmentId?: string) {
    await markNotificationRead(id)
    setOpen(false)
    navigate(kind === 'deadline' ? '/assignments' : assignmentId ? '/assignments' : '/reminders')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
      >
        {unread > 0 ? <BellRing className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-[var(--accent-ink)]">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ y: -6, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(88vw,340px)] overflow-hidden rounded-2xl border border-border bg-surface shadow-float"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-xs font-bold text-ink">Notifikasi</p>
                <p className="text-[10px] text-muted">
                  {unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
                </p>
              </div>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-accent transition hover:bg-accent-soft"
                >
                  <CheckCheck className="h-3 w-3" />
                  Tandai dibaca
                </button>
              ) : null}
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {notifications === undefined ? (
                <p className="px-3 py-6 text-center text-xs text-muted">Memuat…</p>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto mb-2 h-5 w-5 text-muted-2" />
                  <p className="text-xs font-medium text-ink">Belum ada notifikasi</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Pengingat dan deadline akan muncul di sini.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon =
                    notification.kind === 'deadline'
                      ? Clock3
                      : notification.kind === 'reminder'
                        ? Bell
                        : Info
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() =>
                        handleOpenNotification(
                          notification.id,
                          notification.kind,
                          notification.assignmentId,
                        )
                      }
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-surface-2',
                        !notification.read && 'bg-accent-soft/50',
                      )}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-ink">
                            {notification.title}
                          </span>
                          {!notification.read ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-relaxed text-muted">
                          {notification.body}
                        </span>
                        <span className="mt-1 block text-[9px] text-muted-2">
                          {timeAgo(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/reminders?tab=notifications')
              }}
              className="flex w-full items-center justify-center gap-1 border-t border-border py-2.5 text-[11px] font-semibold text-accent transition hover:bg-surface-2"
            >
              Lihat semua notifikasi
              <ChevronRight className="h-3 w-3" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
