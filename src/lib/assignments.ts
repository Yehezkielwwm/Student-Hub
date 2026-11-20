import type { Assignment } from '@/types/models'
import { zonedDateTimeToDate } from '@/lib/time'

export function assignmentDueDate(assignment: Assignment, timeZone: string) {
  return zonedDateTimeToDate(assignment.dueDate, assignment.dueTime, timeZone)
}

export function isAssignmentOverdue(assignment: Assignment, timeZone: string, now: Date) {
  if (assignment.status === 'completed') return false
  return assignmentDueDate(assignment, timeZone).getTime() < now.getTime()
}

export function isAssignmentDueSoon(
  assignment: Assignment,
  timeZone: string,
  now: Date,
  withinHours = 48,
) {
  if (assignment.status === 'completed') return false
  const diff = assignmentDueDate(assignment, timeZone).getTime() - now.getTime()
  return diff >= 0 && diff <= withinHours * 3600 * 1000
}

export function assignmentDeadlineMs(assignment: Assignment, timeZone: string, now: Date) {
  return assignmentDueDate(assignment, timeZone).getTime() - now.getTime()
}

export function sortByDeadline(a: Assignment, b: Assignment) {
  const keyA = `${a.dueDate}T${a.dueTime}`
  const keyB = `${b.dueDate}T${b.dueTime}`
  return keyA.localeCompare(keyB)
}

export function sortByPriority(a: Assignment, b: Assignment) {
  const weight = { high: 3, medium: 2, low: 1 } as const
  return weight[b.priority] - weight[a.priority] || sortByDeadline(a, b)
}

export function todayISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}
