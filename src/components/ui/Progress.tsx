import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { clamp } from '@/lib/utils'

export function Progress({
  value,
  className,
  barClassName,
  color,
}: {
  value: number
  className?: string
  barClassName?: string
  color?: string
}) {
  const safe = clamp(Math.round(value), 0, 100)
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn('h-full rounded-full bg-accent', barClassName)}
        style={color ? { backgroundColor: color } : undefined}
        initial={false}
        animate={{ width: `${safe}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  )
}
