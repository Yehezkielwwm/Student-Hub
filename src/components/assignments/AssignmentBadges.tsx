import { AlertCircle, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useClock } from '@/hooks/useClock'
import { usePreferences } from '@/hooks/useProfile'
import { assignmentDeadlineMs, isAssignmentOverdue } from '@/lib/assignments'
import { PRIORITY_META, STATUS_META } from '@/lib/constants'
import { formatDeadlineDistance, zonedDateTimeToDate } from '@/lib/time'
import type { Assignment, Priority } from '@/types/models'

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority]
  return (
    <Badge color={meta.color} soft={meta.soft}>
      {meta.label}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: Assignment['status'] }) {
  const meta = STATUS_META[status]
  return (
    <Badge color={meta.color} soft={meta.soft}>
      {meta.label}
    </Badge>
  )
}

export function DeadlineBadge({ assignment }: { assignment: Assignment }) {
  const { now } = useClock()
  const prefs = usePreferences()
  if (assignment.status === 'completed') {
    return (
      <Badge variant="success" className="gap-1">
        Selesai
      </Badge>
    )
  }
  const overdue = isAssignmentOverdue(assignment, prefs.timezone, now)
  const ms = assignmentDeadlineMs(assignment, prefs.timezone, now)
  const dueSoon = !overdue && ms <= 48 * 3600 * 1000
  return (
    <Badge variant={overdue ? 'danger' : dueSoon ? 'warning' : 'neutral'} className="gap-1">
      {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
      {overdue ? formatDeadlineDistance(ms) : formatDeadlineDistance(ms)}
    </Badge>
  )
}

export function dueDateLabel(assignment: Assignment, timeZone: string) {
  const date = zonedDateTimeToDate(assignment.dueDate, assignment.dueTime, timeZone)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date)
}
