import type { AssignmentStatus, Priority, Recurrence } from '@/types/models'

export const SUBJECT_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#64748b',
]

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; soft: string; weight: number }
> = {
  high: { label: 'Tinggi', color: '#d92d20', soft: 'var(--danger-soft)', weight: 3 },
  medium: { label: 'Sedang', color: '#b45309', soft: 'var(--warning-soft)', weight: 2 },
  low: { label: 'Rendah', color: '#475467', soft: 'var(--surface-2)', weight: 1 },
}

export const STATUS_META: Record<
  AssignmentStatus,
  { label: string; color: string; soft: string }
> = {
  not_started: { label: 'Belum dimulai', color: 'var(--muted)', soft: 'var(--surface-2)' },
  in_progress: { label: 'Dikerjakan', color: 'var(--accent)', soft: 'var(--accent-soft)' },
  completed: { label: 'Selesai', color: 'var(--success)', soft: 'var(--success-soft)' },
}

export const RECURRENCE_META: Record<Recurrence, { label: string }> = {
  none: { label: 'Sekali' },
  daily: { label: 'Setiap hari' },
  weekly: { label: 'Setiap minggu' },
}

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: 'overview' },
  { to: '/schedule', label: 'Schedule', icon: 'schedule' },
  { to: '/assignments', label: 'Assignments', icon: 'assignments' },
  { to: '/reminders', label: 'Reminders', icon: 'reminders' },
  { to: '/subjects', label: 'My Subjects', icon: 'subjects' },
  { to: '/files', label: 'File Manager', icon: 'files' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
] as const
