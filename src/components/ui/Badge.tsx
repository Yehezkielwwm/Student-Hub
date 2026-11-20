import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
}

export function Badge({
  children,
  variant = 'neutral',
  color,
  soft,
  className,
  dot = false,
}: {
  children: ReactNode
  variant?: BadgeVariant
  color?: string
  soft?: string
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5 whitespace-nowrap',
        VARIANTS[variant],
        className,
      )}
      style={color ? { color, backgroundColor: soft ?? `${color}18`, borderColor: `${color}30` } : undefined}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color ?? 'currentColor' }} /> : null}
      {children}
    </span>
  )
}
