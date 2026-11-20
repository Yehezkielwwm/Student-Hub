import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore, type ToastVariant } from '@/stores/toast-store'

const VARIANTS: Record<
  ToastVariant,
  { icon: typeof Info; className: string; iconClassName: string }
> = {
  success: {
    icon: CheckCircle2,
    className: 'border-success/25',
    iconClassName: 'text-success',
  },
  error: { icon: XCircle, className: 'border-danger/25', iconClassName: 'text-danger' },
  warning: {
    icon: AlertTriangle,
    className: 'border-warning/25',
    iconClassName: 'text-warning',
  },
  info: { icon: Info, className: 'border-accent/20', iconClassName: 'text-accent' },
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const meta = VARIANTS[item.variant]
          const Icon = meta.icon
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ y: 16, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-surface p-4 shadow-float ${meta.className}`}
              role="status"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconClassName}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-lg p-1 text-muted-2 transition hover:bg-surface-2 hover:text-ink"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
