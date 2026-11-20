export type ThemeMode = 'light' | 'dark' | 'system'
export type TimeFormat = '12h' | '24h'
export type WeekStartsOn = 0 | 1

export interface Preferences {
  theme: ThemeMode
  timeFormat: TimeFormat
  weekStartsOn: WeekStartsOn
  timezone: string
  notificationsEnabled: boolean
  browserNotifications: boolean
  deadlineAlerts: boolean
}

export interface Profile {
  id: string
  name: string
  avatarAssetId?: string
  prefs: Preferences
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: string
  blob: Blob
  mime: string
  createdAt: string
}

export interface Subject {
  id: string
  name: string
  color: string
  description: string
  createdAt: string
  updatedAt: string
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface ScheduleSlot {
  id: string
  subjectId: string
  weekday: Weekday
  startTime: string
  endTime: string
  room?: string
  createdAt: string
  updatedAt: string
}

export type Priority = 'low' | 'medium' | 'high'
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed'

export interface Assignment {
  id: string
  title: string
  subjectId: string
  description: string
  priority: Priority
  status: AssignmentStatus
  dueDate: string
  dueTime: string
  notes: string
  attachmentFileIds: string[]
  completedAt?: string
  deadlineNotifiedAt?: string
  createdAt: string
  updatedAt: string
}

export type Recurrence = 'none' | 'daily' | 'weekly'

export interface Reminder {
  id: string
  title: string
  description: string
  dueAt: string
  assignmentId?: string
  recurrence: Recurrence
  completed: boolean
  notifiedAt?: string
  createdAt: string
  updatedAt: string
}

export type NotificationKind = 'reminder' | 'deadline' | 'info'

export interface AppNotification {
  id: string
  title: string
  body: string
  kind: NotificationKind
  read: boolean
  reminderId?: string
  assignmentId?: string
  createdAt: string
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface FileCategory {
  id: string
  name: string
  color: string
  isDefault: boolean
  createdAt: string
}

export interface StoredFile {
  id: string
  name: string
  ext: string
  mime: string
  size: number
  folderId: string | null
  categoryId: string
  subjectId?: string
  createdAt: string
  updatedAt: string
}

export interface FileBlobRecord {
  fileId: string
  blob: Blob
}

export type ActivityType = 'assignment_completed' | 'file_uploaded' | 'reminder_completed'

export interface ActivityEntry {
  id: string
  type: ActivityType
  refId: string
  date: string
  createdAt: string
}

export interface NewSubjectInput {
  name: string
  color: string
  description?: string
}

export interface NewAssignmentInput {
  title: string
  subjectId: string
  description?: string
  priority: Priority
  status: AssignmentStatus
  dueDate: string
  dueTime: string
  notes?: string
  attachmentFileIds?: string[]
}

export interface NewScheduleInput {
  subjectId: string
  weekday: Weekday
  startTime: string
  endTime: string
  room?: string
}

export interface NewReminderInput {
  title: string
  description?: string
  dueAt: string
  assignmentId?: string
  recurrence: Recurrence
}
