import { db } from '@/db'
import type { FileCategory, Folder, StoredFile } from '@/types/models'
import { getExtension, isAcceptedFile, MAX_FILE_SIZE, normalizeFileName } from '@/lib/files'
import { nowISO, uid } from '@/lib/utils'
import { logActivity } from '@/services/assignments'

export interface UploadOptions {
  folderId: string | null
  categoryId: string
  subjectId?: string
}

function validateUpload(file: File) {
  if (!isAcceptedFile(file)) {
    throw new Error(`Tipe file "${getExtension(file.name) || 'tanpa ekstensi'}" tidak didukung.`)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Ukuran file maksimal 25 MB.')
  }
  if (file.size === 0) {
    throw new Error('File kosong tidak dapat diunggah.')
  }
}

async function uniqueFileName(name: string, folderId: string | null, excludeId?: string) {
  const siblings = await db.files
    .filter((file) => file.folderId === folderId && file.id !== excludeId)
    .toArray()
  const existing = new Set(siblings.map((file) => file.name.toLowerCase()))
  if (!existing.has(name.toLowerCase())) return name
  const ext = getExtension(name)
  const base = ext ? name.slice(0, -(ext.length + 1)) : name
  let counter = 1
  let candidate = `${base} (${counter})${ext ? `.${ext}` : ''}`
  while (existing.has(candidate.toLowerCase())) {
    counter += 1
    candidate = `${base} (${counter})${ext ? `.${ext}` : ''}`
  }
  return candidate
}

export async function uploadSchoolFile(file: File, options: UploadOptions): Promise<string> {
  validateUpload(file)
  const timestamp = nowISO()
  const id = uid()
  const name = await uniqueFileName(normalizeFileName(file.name), options.folderId)
  const ext = getExtension(name)
  const record: StoredFile = {
    id,
    name,
    ext,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    folderId: options.folderId,
    categoryId: options.categoryId || 'other',
    subjectId: options.subjectId || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.transaction('rw', db.files, db.fileBlobs, async () => {
    await db.files.add(record)
    await db.fileBlobs.add({ fileId: id, blob: file })
  })
  await logActivity('file_uploaded', id)
  return id
}

export async function renameFile(id: string, rawName: string) {
  const file = await db.files.get(id)
  if (!file) throw new Error('File tidak ditemukan.')
  const ext = getExtension(file.name)
  let nextName = normalizeFileName(rawName)
  if (!nextName) throw new Error('Nama file wajib diisi.')
  if (ext && !nextName.toLowerCase().endsWith(`.${ext}`)) {
    nextName = `${nextName}.${ext}`
  }
  const unique = await uniqueFileName(nextName, file.folderId, id)
  await db.files.update(id, {
    name: unique,
    ext: getExtension(unique),
    updatedAt: nowISO(),
  })
}

export async function moveFile(id: string, folderId: string | null) {
  const file = await db.files.get(id)
  if (!file) throw new Error('File tidak ditemukan.')
  const unique = await uniqueFileName(file.name, folderId, id)
  await db.files.update(id, { folderId, name: unique, updatedAt: nowISO() })
}

export async function deleteFile(id: string) {
  await db.transaction('rw', db.files, db.fileBlobs, async () => {
    await db.files.delete(id)
    await db.fileBlobs.delete(id)
  })
}

export async function getFileBlob(id: string) {
  const record = await db.fileBlobs.get(id)
  return record?.blob ?? null
}

export async function downloadFile(file: StoredFile) {
  const blob = await getFileBlob(file.id)
  if (!blob) throw new Error('Isi file tidak ditemukan di penyimpanan lokal.')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function createFolder(name: string, parentId: string | null): Promise<string> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Nama folder wajib diisi.')
  const siblings = await db.folders.filter((folder) => folder.parentId === parentId).toArray()
  if (siblings.some((folder) => folder.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Folder dengan nama tersebut sudah ada di lokasi ini.')
  }
  const timestamp = nowISO()
  const id = uid()
  await db.folders.add({
    id,
    name: trimmed,
    parentId,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return id
}

export async function renameFolder(id: string, rawName: string) {
  const folder = await db.folders.get(id)
  if (!folder) throw new Error('Folder tidak ditemukan.')
  const name = rawName.trim()
  if (!name) throw new Error('Nama folder wajib diisi.')
  const siblings = await db.folders
    .filter((item) => item.parentId === folder.parentId && item.id !== id)
    .toArray()
  if (siblings.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Folder dengan nama tersebut sudah ada di lokasi ini.')
  }
  await db.folders.update(id, { name, updatedAt: nowISO() })
}

export async function deleteFolderRecursive(id: string) {
  const folders = await db.folders.toArray()
  const ids = new Set<string>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id)
        changed = true
      }
    }
  }
  const fileIds = await db.files
    .filter((file) => file.folderId !== null && ids.has(file.folderId))
    .primaryKeys()
  await db.transaction('rw', db.folders, db.files, db.fileBlobs, async () => {
    if (fileIds.length) {
      await db.files.bulkDelete(fileIds)
      await db.fileBlobs.bulkDelete(fileIds)
    }
    await db.folders.bulkDelete([...ids])
  })
}

export async function createFileCategory(name: string, color: string): Promise<string> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Nama kategori wajib diisi.')
  const duplicate = await db.categories.where('name').equalsIgnoreCase(trimmed).first()
  if (duplicate) throw new Error('Kategori dengan nama tersebut sudah ada.')
  const id = uid()
  await db.categories.add({
    id,
    name: trimmed,
    color,
    isDefault: false,
    createdAt: nowISO(),
  })
  return id
}

export async function deleteFileCategory(id: string) {
  const category = await db.categories.get(id)
  if (!category) return
  if (category.isDefault) throw new Error('Kategori bawaan tidak dapat dihapus.')
  await db.transaction('rw', db.categories, db.files, async () => {
    await db.files.where('categoryId').equals(id).modify({ categoryId: 'other', updatedAt: nowISO() })
    await db.categories.delete(id)
  })
}

export function folderPath(folders: Folder[], folderId: string | null): Folder[] {
  if (!folderId) return []
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const path: Folder[] = []
  let current = byId.get(folderId)
  let guard = 0
  while (current && guard < 50) {
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
    guard += 1
  }
  return path
}

export function descendantFolderIds(folders: Folder[], folderId: string): string[] {
  const result: string[] = []
  const walk = (parentId: string) => {
    for (const folder of folders) {
      if (folder.parentId === parentId) {
        result.push(folder.id)
        walk(folder.id)
      }
    }
  }
  walk(folderId)
  return result
}

export interface FolderOption {
  id: string | null
  label: string
  depth: number
}

export function folderOptions(folders: Folder[], excludeIds: string[] = []): FolderOption[] {
  const options: FolderOption[] = [{ id: null, label: 'Semua file (root)', depth: 0 }]
  const childrenOf = (parentId: string | null) =>
    folders
      .filter((folder) => folder.parentId === parentId && !excludeIds.includes(folder.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  const walk = (parentId: string | null, depth: number) => {
    for (const folder of childrenOf(parentId)) {
      options.push({ id: folder.id, label: folder.name, depth })
      walk(folder.id, depth + 1)
    }
  }
  walk(null, 1)
  return options
}

export async function fileCategoryMap() {
  const categories = await db.categories.toArray()
  return new Map<string, FileCategory>(categories.map((category) => [category.id, category]))
}
