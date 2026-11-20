import { useEffect, useState } from 'react'
import { Download, Plus, Trash2, UploadCloud, X } from 'lucide-react'
import { useCategories, useSubjects } from '@/hooks/useProfile'
import { useFileBlob, useObjectUrl } from '@/hooks/useFiles'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field, Input, Select } from '@/components/ui/Field'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  ACCEPTED_EXTENSIONS,
  FILE_KIND_META,
  fileAcceptAttribute,
  formatBytes,
  getExtension,
  getFileKind,
  isAcceptedFile,
  MAX_FILE_SIZE,
} from '@/lib/files'
import { formatDateTimeISO } from '@/lib/time'
import { SUBJECT_COLORS } from '@/lib/constants'
import {
  createFileCategory,
  deleteFileCategory,
  downloadFile,
  folderOptions,
  moveFile,
  uploadSchoolFile,
} from '@/services/files'
import { toast } from '@/stores/toast-store'
import type { FileCategory, Folder as FolderType, StoredFile } from '@/types/models'

export function FileUploadModal({
  folderId,
  folderLabel,
  initialFiles,
  onClose,
}: {
  folderId: string | null
  folderLabel: string
  initialFiles?: File[]
  onClose: () => void
}) {
  const categories = useCategories()
  const subjects = useSubjects()
  const [files, setFiles] = useState<File[]>(initialFiles ?? [])
  const [categoryId, setCategoryId] = useState('other')
  const [subjectId, setSubjectId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  function addFiles(incoming: File[]) {
    const accepted: File[] = []
    let rejected = 0
    for (const file of incoming) {
      if (!isAcceptedFile(file) || file.size > MAX_FILE_SIZE || file.size === 0) {
        rejected += 1
      } else {
        accepted.push(file)
      }
    }
    if (accepted.length) setFiles((current) => [...current, ...accepted])
    if (rejected > 0) {
      toast.warning(
        `${rejected} file dilewati`,
        `Hanya ${ACCEPTED_EXTENSIONS.join(', ')} dengan ukuran maksimal 25 MB yang didukung.`,
      )
    }
  }

  async function handleUpload() {
    if (files.length === 0) return
    setUploading(true)
    let success = 0
    const remaining: File[] = []
    let firstError = ''
    for (const file of files) {
      try {
        await uploadSchoolFile(file, { folderId, categoryId, subjectId: subjectId || undefined })
        success += 1
      } catch (error) {
        remaining.push(file)
        if (!firstError) firstError = error instanceof Error ? error.message : 'Terjadi kesalahan.'
      }
    }
    setUploading(false)
    if (success > 0) {
      toast.success(`${success} file berhasil diunggah`, `Disimpan di ${folderLabel}.`)
    }
    if (remaining.length > 0) {
      setFiles(remaining)
      toast.error(`${remaining.length} file gagal diunggah`, firstError)
    } else {
      onClose()
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Upload file"
      description={`Tujuan: ${folderLabel}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Batal
          </Button>
          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={files.length === 0}
            icon={<UploadCloud className="h-4 w-4" />}
          >
            Upload {files.length > 0 ? `${files.length} file` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragActive(false)
            addFiles(Array.from(event.dataTransfer.files))
          }}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragActive ? 'border-accent bg-accent-soft/50' : 'border-border bg-surface-2/40'
          }`}
        >
          <UploadCloud className="mx-auto h-7 w-7 text-muted" />
          <p className="mt-2 text-xs font-semibold text-ink">Tarik dan lepas file di sini</p>
          <p className="mt-0.5 text-[10px] text-muted">
            PDF, DOCX, DOC, PPTX, XLSX, JPG, PNG, ZIP, TXT · maks. 25 MB
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-ink transition hover:bg-surface-2">
            Pilih file
            <input
              type="file"
              multiple
              accept={fileAcceptAttribute()}
              className="hidden"
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []))
                event.target.value = ''
              }}
            />
          </label>
        </div>

        {files.length > 0 ? (
          <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
              >
                <FileTypeIcon ext={getExtension(file.name)} size={26} />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink">
                  {file.name}
                </span>
                <span className="text-[9px] text-muted">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={`Hapus ${file.name} dari daftar`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori file">
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hubungkan ke mapel" hint="Opsional">
            <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">Tanpa mata pelajaran</option>
              {(subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}

export function FilePreviewModal({
  file,
  folderLabel,
  onClose,
}: {
  file: StoredFile
  folderLabel: string
  onClose: () => void
}) {
  const blobRecord = useFileBlob(file.id)
  const url = useObjectUrl(blobRecord?.blob)
  const [text, setText] = useState<string | null>(null)
  const categories = useCategories()
  const subjects = useSubjects()
  const kind = getFileKind(file.ext)
  const category = (categories ?? []).find((item) => item.id === file.categoryId)
  const subject = (subjects ?? []).find((item) => item.id === file.subjectId)
  const isImage = ['jpg', 'jpeg', 'png'].includes(file.ext.toLowerCase())
  const isPdf = file.ext.toLowerCase() === 'pdf'
  const isText = file.ext.toLowerCase() === 'txt'

  useEffect(() => {
    let active = true
    if (isText && blobRecord?.blob) {
      void blobRecord.blob.text().then((value) => {
        if (active) setText(value)
      })
    }
    return () => {
      active = false
    }
  }, [blobRecord, isText])

  return (
    <Modal
      open
      onClose={onClose}
      title={file.name}
      description={`${FILE_KIND_META[kind].label} · ${formatBytes(file.size)}`}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button
            icon={<Download className="h-4 w-4" />}
            onClick={() => {
              void downloadFile(file).catch((error) =>
                toast.error('Gagal mengunduh file', error instanceof Error ? error.message : undefined),
              )
            }}
          >
            Download
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2/60 p-2">
          {!blobRecord ? (
            <Skeleton className="h-64 w-full" />
          ) : isImage && url ? (
            <img src={url} alt={file.name} className="max-h-[58vh] w-auto rounded-xl object-contain" />
          ) : isPdf && url ? (
            <iframe src={url} title={file.name} className="h-[58vh] w-full rounded-xl border border-border bg-white" />
          ) : isText ? (
            <pre className="max-h-[58vh] w-full overflow-auto whitespace-pre-wrap rounded-xl bg-surface p-4 text-left text-xs leading-relaxed text-ink">
              {text ?? 'Memuat isi file…'}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <FileTypeIcon ext={file.ext} size={56} />
              <p className="mt-3 text-sm font-semibold text-ink">Preview tidak tersedia</p>
              <p className="mt-1 max-w-sm text-xs text-muted">
                Format {file.ext.toUpperCase() || 'ini'} tidak dapat ditampilkan di browser. Unduh
                file untuk membukanya di aplikasi yang sesuai.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-4"
                icon={<Download className="h-3.5 w-3.5" />}
                onClick={() =>
                  void downloadFile(file).catch((error) =>
                    toast.error('Gagal mengunduh file', error instanceof Error ? error.message : undefined),
                  )
                }
              >
                Download file
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-2 rounded-2xl border border-border bg-surface-2/40 p-4 text-[11px] sm:grid-cols-2">
          <div className="flex justify-between gap-3 sm:block">
            <span className="text-muted">Tipe file</span>
            <p className="font-semibold text-ink">
              {file.ext.toUpperCase()} · {FILE_KIND_META[kind].label}
            </p>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <span className="text-muted">Ukuran</span>
            <p className="font-semibold text-ink">{formatBytes(file.size)}</p>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <span className="text-muted">Diunggah</span>
            <p className="font-semibold text-ink">{formatDateTimeISO(file.createdAt)}</p>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <span className="text-muted">Lokasi folder</span>
            <p className="truncate font-semibold text-ink">{folderLabel}</p>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <span className="text-muted">Kategori</span>
            <p className="font-semibold text-ink">{category?.name ?? 'Other'}</p>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <span className="text-muted">Mata pelajaran</span>
            <p className="font-semibold text-ink">{subject?.name ?? 'Tidak terhubung'}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function NameDialog({
  title,
  description,
  label,
  initialValue,
  submitLabel = 'Simpan',
  onSubmit,
  onClose,
}: {
  title: string
  description?: string
  label: string
  initialValue?: string
  submitLabel?: string
  onSubmit: (value: string) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState(initialValue ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!value.trim()) {
      setError('Nama wajib diisi.')
      return
    }
    try {
      setSaving(true)
      await onSubmit(value.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" form="name-dialog-form" loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="name-dialog-form" onSubmit={handleSubmit}>
        <Field label={label} error={error}>
          <Input
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setError('')
            }}
            autoFocus
            maxLength={80}
          />
        </Field>
      </form>
    </Modal>
  )
}

export function MoveFileDialog({
  file,
  folders,
  onClose,
}: {
  file: StoredFile
  folders: FolderType[]
  onClose: () => void
}) {
  const options = folderOptions(folders)
  const [destination, setDestination] = useState(file.folderId ?? '')
  const [saving, setSaving] = useState(false)

  async function handleMove() {
    try {
      setSaving(true)
      await moveFile(file.id, destination || null)
      toast.success('File dipindahkan')
      onClose()
    } catch (error) {
      toast.error('Gagal memindahkan file', error instanceof Error ? error.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Pindahkan file"
      description={file.name}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleMove} loading={saving}>
            Pindahkan
          </Button>
        </>
      }
    >
      <Field label="Folder tujuan">
        <Select value={destination} onChange={(event) => setDestination(event.target.value)}>
          {options.map((option) => (
            <option key={option.id ?? 'root'} value={option.id ?? ''}>
              {'—'.repeat(option.depth)} {option.label}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  )
}

export function CategoryManagerModal({
  files,
  onClose,
}: {
  files: StoredFile[]
  onClose: () => void
}) {
  const categories = useCategories()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[1])
  const [saving, setSaving] = useState(false)

  const counts = new Map<string, number>()
  for (const file of files) counts.set(file.categoryId, (counts.get(file.categoryId) ?? 0) + 1)

  async function handleAdd() {
    try {
      setSaving(true)
      await createFileCategory(name, color)
      setName('')
      toast.success('Kategori ditambahkan')
    } catch (error) {
      toast.error('Gagal menambah kategori', error instanceof Error ? error.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Kelola kategori file" description="Kategori membantumu menyaring file." size="md">
      <div className="space-y-3">
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {(categories ?? []).map((category: FileCategory) => (
            <div
              key={category.id}
              className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                {category.name}
              </span>
              <span className="text-[9px] text-muted">{counts.get(category.id) ?? 0} file</span>
              {category.isDefault ? (
                <Badge variant="neutral">Bawaan</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void deleteFileCategory(category.id)
                      .then(() => toast.success('Kategori dihapus', 'File dipindahkan ke kategori Other.'))
                      .catch((error) =>
                        toast.error('Gagal menghapus kategori', error instanceof Error ? error.message : undefined),
                      )
                  }}
                  className="rounded p-1 text-muted transition hover:bg-danger-soft hover:text-danger"
                  aria-label={`Hapus kategori ${category.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/40 p-3">
          <p className="text-xs font-semibold text-ink">Kategori baru</p>
          <div className="mt-2 flex gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama kategori"
              maxLength={40}
            />
            <Button onClick={handleAdd} loading={saving} disabled={!name.trim()} icon={<Plus className="h-4 w-4" />}>
              Tambah
            </Button>
          </div>
          <div className="mt-2">
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
