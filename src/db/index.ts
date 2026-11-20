import Dexie, { type Table } from 'dexie'
import type {
  ActivityEntry,
  AppNotification,
  Asset,
  Assignment,
  FileBlobRecord,
  FileCategory,
  Folder,
  Profile,
  Reminder,
  ScheduleSlot,
  StoredFile,
  Subject,
} from '@/types/models'
import { deviceTimeZone } from '@/lib/time'
import { nowISO } from '@/lib/utils'

export const DEFAULT_CATEGORIES: FileCategory[] = [
  { id: 'mathematics', name: 'Mathematics', color: '#4f46e5', isDefault: true, createdAt: nowISO() },
  { id: 'physics', name: 'Physics', color: '#0ea5e9', isDefault: true, createdAt: nowISO() },
  { id: 'chemistry', name: 'Chemistry', color: '#14b8a6', isDefault: true, createdAt: nowISO() },
  { id: 'biology', name: 'Biology', color: '#10b981', isDefault: true, createdAt: nowISO() },
  { id: 'informatics', name: 'Informatics', color: '#6366f1', isDefault: true, createdAt: nowISO() },
  { id: 'indonesian', name: 'Indonesian', color: '#f59e0b', isDefault: true, createdAt: nowISO() },
  { id: 'english', name: 'English', color: '#ec4899', isDefault: true, createdAt: nowISO() },
  { id: 'history', name: 'History', color: '#b45309', isDefault: true, createdAt: nowISO() },
  { id: 'other', name: 'Other', color: '#64748b', isDefault: true, createdAt: nowISO() },
]

export function createDefaultProfile(): Profile {
  const timestamp = nowISO()
  return {
    id: 'me',
    name: 'Siswa',
    prefs: {
      theme: 'system',
      timeFormat: '24h',
      weekStartsOn: 1,
      timezone: deviceTimeZone(),
      notificationsEnabled: true,
      browserNotifications: false,
      deadlineAlerts: true,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

class StudentHubDatabase extends Dexie {
  profile!: Table<Profile, string>
  assets!: Table<Asset, string>
  subjects!: Table<Subject, string>
  schedule!: Table<ScheduleSlot, string>
  assignments!: Table<Assignment, string>
  reminders!: Table<Reminder, string>
  notifications!: Table<AppNotification, string>
  folders!: Table<Folder, string>
  files!: Table<StoredFile, string>
  fileBlobs!: Table<FileBlobRecord, string>
  categories!: Table<FileCategory, string>
  activity!: Table<ActivityEntry, string>

  constructor() {
    super('student-hub')
    this.version(1).stores({
      profile: 'id',
      assets: 'id',
      subjects: 'id, name, createdAt',
      schedule: 'id, subjectId, weekday, [weekday+startTime]',
      assignments: 'id, subjectId, status, dueDate, priority, createdAt',
      reminders: 'id, dueAt, assignmentId, createdAt',
      notifications: 'id, createdAt, read',
      folders: 'id, parentId, createdAt',
      files: 'id, folderId, categoryId, subjectId, name, createdAt',
      fileBlobs: 'fileId',
      categories: 'id, name',
      activity: 'id, date, createdAt',
    })
  }
}

export const db = new StudentHubDatabase()

export async function ensureDatabase() {
  const profile = await db.profile.get('me')
  if (!profile) {
    await db.profile.put(createDefaultProfile())
  }
  const categoryCount = await db.categories.count()
  if (categoryCount === 0) {
    await db.categories.bulkPut(DEFAULT_CATEGORIES)
  }
}

export async function clearAllData() {
  await db.transaction(
    'rw',
    [
      db.profile,
      db.assets,
      db.subjects,
      db.schedule,
      db.assignments,
      db.reminders,
      db.notifications,
      db.folders,
      db.files,
      db.fileBlobs,
      db.categories,
      db.activity,
    ],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.assets.clear(),
        db.subjects.clear(),
        db.schedule.clear(),
        db.assignments.clear(),
        db.reminders.clear(),
        db.notifications.clear(),
        db.folders.clear(),
        db.files.clear(),
        db.fileBlobs.clear(),
        db.categories.clear(),
        db.activity.clear(),
      ])
      await db.profile.put(createDefaultProfile())
      await db.categories.bulkPut(DEFAULT_CATEGORIES)
    },
  )
}
