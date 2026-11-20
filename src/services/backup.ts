import { db, ensureDatabase } from '@/db'
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

interface BackupPayload {
  app: 'student-hub'
  version: 1
  exportedAt: string
  data: {
    profile: Profile | undefined
    subjects: Subject[]
    schedule: ScheduleSlot[]
    assignments: Assignment[]
    reminders: Reminder[]
    notifications: AppNotification[]
    folders: Folder[]
    files: StoredFile[]
    categories: FileCategory[]
    activity: ActivityEntry[]
  }
  blobs: Record<string, { mime: string; dataUrl: string }>
  assets: Record<string, { mime: string; dataUrl: string }>
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca file untuk ekspor.'))
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

export async function exportAllData(): Promise<{ json: string; fileName: string }> {
  const [
    profile,
    subjects,
    schedule,
    assignments,
    reminders,
    notifications,
    folders,
    files,
    categories,
    activity,
    blobRecords,
    assets,
  ] = await Promise.all([
    db.profile.get('me'),
    db.subjects.toArray(),
    db.schedule.toArray(),
    db.assignments.toArray(),
    db.reminders.toArray(),
    db.notifications.toArray(),
    db.folders.toArray(),
    db.files.toArray(),
    db.categories.toArray(),
    db.activity.toArray(),
    db.fileBlobs.toArray(),
    db.assets.toArray(),
  ])

  const blobs: BackupPayload['blobs'] = {}
  for (const record of blobRecords) {
    blobs[record.fileId] = {
      mime: record.blob.type || 'application/octet-stream',
      dataUrl: await blobToDataUrl(record.blob),
    }
  }
  const assetPayload: BackupPayload['assets'] = {}
  for (const asset of assets) {
    assetPayload[asset.id] = { mime: asset.mime, dataUrl: await blobToDataUrl(asset.blob) }
  }

  const payload: BackupPayload = {
    app: 'student-hub',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      profile,
      subjects,
      schedule,
      assignments,
      reminders,
      notifications,
      folders,
      files,
      categories,
      activity,
    },
    blobs,
    assets: assetPayload,
  }
  const stamp = new Date().toISOString().slice(0, 10)
  return { json: JSON.stringify(payload), fileName: `student-hub-backup-${stamp}.json` }
}

export async function importAllData(raw: string) {
  let parsed: BackupPayload
  try {
    parsed = JSON.parse(raw) as BackupPayload
  } catch {
    throw new Error('File backup bukan JSON yang valid.')
  }
  if (parsed?.app !== 'student-hub' || !parsed.data) {
    throw new Error('File ini bukan backup Student Hub.')
  }

  const assets: Asset[] = []
  for (const [id, asset] of Object.entries(parsed.assets ?? {})) {
    const blob = await dataUrlToBlob(asset.dataUrl)
    assets.push({ id, blob, mime: asset.mime, createdAt: new Date().toISOString() })
  }
  const blobRecords: FileBlobRecord[] = []
  for (const [fileId, blob] of Object.entries(parsed.blobs ?? {})) {
    blobRecords.push({ fileId, blob: await dataUrlToBlob(blob.dataUrl) })
  }

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
      if (parsed.data.profile) await db.profile.put(parsed.data.profile)
      await db.subjects.bulkPut(parsed.data.subjects ?? [])
      await db.schedule.bulkPut(parsed.data.schedule ?? [])
      await db.assignments.bulkPut(parsed.data.assignments ?? [])
      await db.reminders.bulkPut(parsed.data.reminders ?? [])
      await db.notifications.bulkPut(parsed.data.notifications ?? [])
      await db.folders.bulkPut(parsed.data.folders ?? [])
      await db.files.bulkPut(parsed.data.files ?? [])
      await db.categories.bulkPut(parsed.data.categories ?? [])
      await db.activity.bulkPut(parsed.data.activity ?? [])
      await db.assets.bulkPut(assets)
      await db.fileBlobs.bulkPut(blobRecords)
    },
  )
  await ensureDatabase()
}

export function downloadJson(json: string, fileName: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
