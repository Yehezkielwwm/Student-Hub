export const MAX_FILE_SIZE = 25 * 1024 * 1024
export const ACCEPTED_EXTENSIONS = [
  'pdf',
  'docx',
  'doc',
  'pptx',
  'xlsx',
  'jpg',
  'jpeg',
  'png',
  'zip',
  'txt',
] as const

export type FileKind = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'zip' | 'text' | 'other'

export const FILE_KIND_META: Record<FileKind, { label: string; color: string; soft: string }> = {
  pdf: { label: 'PDF', color: '#e5484d', soft: 'rgba(229,72,77,0.12)' },
  word: { label: 'Dokumen', color: '#2f6fed', soft: 'rgba(47,111,237,0.12)' },
  excel: { label: 'Spreadsheet', color: '#13875b', soft: 'rgba(19,135,91,0.12)' },
  powerpoint: { label: 'Presentasi', color: '#d97706', soft: 'rgba(217,119,6,0.14)' },
  image: { label: 'Gambar', color: '#8b5cf6', soft: 'rgba(139,92,246,0.14)' },
  zip: { label: 'Arsip', color: '#b45309', soft: 'rgba(180,83,9,0.14)' },
  text: { label: 'Teks', color: '#64748b', soft: 'rgba(100,116,139,0.14)' },
  other: { label: 'File', color: '#64748b', soft: 'rgba(100,116,139,0.14)' },
}

export function getExtension(name: string) {
  const parts = name.split('.')
  if (parts.length < 2) return ''
  return (parts.pop() || '').toLowerCase()
}

export function getBaseName(name: string) {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

export function getFileKind(ext: string): FileKind {
  const normalized = ext.toLowerCase()
  if (normalized === 'pdf') return 'pdf'
  if (['doc', 'docx'].includes(normalized)) return 'word'
  if (['xls', 'xlsx', 'csv'].includes(normalized)) return 'excel'
  if (['ppt', 'pptx'].includes(normalized)) return 'powerpoint'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(normalized)) return 'image'
  if (['zip', 'rar', '7z'].includes(normalized)) return 'zip'
  if (['txt', 'md', 'json'].includes(normalized)) return 'text'
  return 'other'
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

export function isAcceptedFile(file: File) {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(getExtension(file.name))
}

export function isPreviewable(ext: string) {
  return ['pdf', 'txt', 'jpg', 'jpeg', 'png'].includes(ext.toLowerCase())
}

export function fileAcceptAttribute() {
  return ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')
}

export function normalizeFileName(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, '-')
}
