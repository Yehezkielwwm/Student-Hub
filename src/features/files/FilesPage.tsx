import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronRight,
  Download,
  Eye,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Home,
  LayoutGrid,
  List,
  Pencil,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { db } from '@/db'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'
import { Input, Select } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  CategoryManagerModal,
  FilePreviewModal,
  FileUploadModal,
  MoveFileDialog,
  NameDialog,
} from '@/features/files/FileModals'
import { useCategories, useSubjects } from '@/hooks/useProfile'
import { formatBytes, getBaseName } from '@/lib/files'
import { formatDateISO } from '@/lib/time'
import { cn } from '@/lib/utils'
import {
  deleteFile,
  deleteFolderRecursive,
  descendantFolderIds,
  downloadFile,
  folderPath,
  renameFile,
  renameFolder,
  createFolder,
} from '@/services/files'
import { toast } from '@/stores/toast-store'
import type { Folder as FolderType, StoredFile } from '@/types/models'

type SortKey = 'name' | 'size' | 'date' | 'type'
type ViewMode = 'grid' | 'list'

interface DeleteTarget {
  type: 'file' | 'folder'
  file?: StoredFile
  folder?: FolderType
  fileCount: number
}

export default function FilesPage() {
  const folders = useLiveQuery(() => db.folders.toArray(), [])
  const files = useLiveQuery(() => db.files.toArray(), [])
  const categories = useCategories()
  const subjects = useSubjects()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState<SortKey>('name')
  const [view, setView] = useState<ViewMode>('grid')
  const [uploadState, setUploadState] = useState<{ initialFiles?: File[] } | null>(null)
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{
    type: 'file' | 'folder'
    id: string
    name: string
  } | null>(null)
  const [moveTarget, setMoveTarget] = useState<StoredFile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => {
    if (searchParams.get('upload')) {
      setUploadState({})
      const next = new URLSearchParams(searchParams)
      next.delete('upload')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const subjectMap = useMemo(
    () => new Map((subjects ?? []).map((subject) => [subject.id, subject])),
    [subjects],
  )
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category])),
    [categories],
  )
  const path = folderPath(folders ?? [], currentFolderId)
  const currentLabel = path.length > 0 ? path[path.length - 1].name : 'Semua file'

  const folderFileCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const file of files ?? []) {
      if (!file.folderId) continue
      counts.set(file.folderId, (counts.get(file.folderId) ?? 0) + 1)
    }
    return counts
  }, [files])

  const query = search.trim().toLowerCase()
  const subfolders = useMemo(() => {
    if (query) return []
    return (folders ?? [])
      .filter((folder) => folder.parentId === currentFolderId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, currentFolderId, query])

  const visibleFiles = useMemo(() => {
    let scoped = files ?? []
    if (!query) scoped = scoped.filter((file) => file.folderId === currentFolderId)
    if (categoryFilter !== 'all') {
      scoped = scoped.filter((file) => file.categoryId === categoryFilter)
    }
    if (query) {
      scoped = scoped.filter((file) => {
        const subject = file.subjectId ? subjectMap.get(file.subjectId) : undefined
        return `${file.name} ${subject?.name ?? ''}`.toLowerCase().includes(query)
      })
    }
    return [...scoped].sort((a, b) => {
      if (sort === 'size') return b.size - a.size
      if (sort === 'date') return b.createdAt.localeCompare(a.createdAt)
      if (sort === 'type') return a.ext.localeCompare(b.ext) || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name)
    })
  }, [files, query, currentFolderId, categoryFilter, sort, subjectMap])

  const totalFiles = files?.length ?? 0
  const isEmpty = subfolders.length === 0 && visibleFiles.length === 0
  const filtersActive = query !== '' || categoryFilter !== 'all'

  function requestDeleteFile(file: StoredFile) {
    setDeleteTarget({ type: 'file', file, fileCount: 1 })
  }

  function requestDeleteFolder(folder: FolderType) {
    const ids = new Set([folder.id, ...descendantFolderIds(folders ?? [], folder.id)])
    const count = (files ?? []).filter((file) => file.folderId && ids.has(file.folderId)).length
    setDeleteTarget({ type: 'folder', folder, fileCount: count })
  }

  function handleDownload(file: StoredFile) {
    void downloadFile(file).catch((error) =>
      toast.error('Gagal mengunduh file', error instanceof Error ? error.message : undefined),
    )
  }

  async function handleDelete() {
    if (!deleteTarget) return
    if (deleteTarget.type === 'file' && deleteTarget.file) {
      await deleteFile(deleteTarget.file.id)
      toast.success('File dihapus')
    } else if (deleteTarget.folder) {
      const removedIds = new Set([
        deleteTarget.folder.id,
        ...descendantFolderIds(folders ?? [], deleteTarget.folder.id),
      ])
      await deleteFolderRecursive(deleteTarget.folder.id)
      if (currentFolderId && removedIds.has(currentFolderId)) setCurrentFolderId(null)
      toast.success('Folder dihapus')
    }
    setDeleteTarget(null)
  }

  function fileMenuItems(file: StoredFile) {
    return [
      { label: 'Preview', icon: Eye, onClick: () => setPreviewFile(file) },
      { label: 'Download', icon: Download, onClick: () => handleDownload(file) },
      {
        label: 'Rename',
        icon: Pencil,
        onClick: () => setRenameTarget({ type: 'file', id: file.id, name: getBaseName(file.name) }),
      },
      { label: 'Pindahkan', icon: FolderInput, onClick: () => setMoveTarget(file) },
      {
        label: 'Hapus',
        icon: Trash2,
        danger: true,
        onClick: () => requestDeleteFile(file),
      },
    ]
  }

  function folderMenuItems(folder: FolderType) {
    return [
      {
        label: 'Rename folder',
        icon: Pencil,
        onClick: () => setRenameTarget({ type: 'folder', id: folder.id, name: folder.name }),
      },
      {
        label: 'Hapus folder',
        icon: Trash2,
        danger: true,
        onClick: () => requestDeleteFolder(folder),
      },
    ]
  }

  function folderLocation(file: StoredFile) {
    const parts = folderPath(folders ?? [], file.folderId)
    return parts.length ? parts.map((folder) => folder.name).join(' / ') : 'Semua file'
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="File Manager"
        description="Simpan file sekolah langsung di perangkat. Upload, atur folder, dan buka kembali kapan saja."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<FolderPlus className="h-4 w-4" />}
              onClick={() => setCreateFolderOpen(true)}
            >
              Folder baru
            </Button>
            <Button
              icon={<Upload className="h-4 w-4" />}
              onClick={() => setUploadState({})}
            >
              Upload file
            </Button>
          </>
        }
      />

      <Card
        className="relative overflow-hidden"
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setDragActive(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          dragDepth.current -= 1
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setDragActive(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setDragActive(false)
          const dropped = Array.from(event.dataTransfer.files)
          if (dropped.length > 0) setUploadState({ initialFiles: dropped })
        }}
      >
        {dragActive ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-surface/90 backdrop-blur-sm">
            <Upload className="h-7 w-7 text-accent" />
            <p className="mt-2 text-sm font-semibold text-ink">Lepaskan file untuk upload</p>
            <p className="text-[10px] text-muted">File akan disimpan di {currentLabel}</p>
          </div>
        ) : null}

        <div className="space-y-3 border-b border-border p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari file di semua folder…"
                className="pl-9"
                aria-label="Cari file"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                aria-label="Urutkan file"
                className="w-[150px]"
              >
                <option value="name">Nama A–Z</option>
                <option value="size">Ukuran terbesar</option>
                <option value="date">Terbaru diunggah</option>
                <option value="type">Tipe file</option>
              </Select>
              <SegmentedControl<ViewMode>
                ariaLabel="Tampilan file"
                value={view}
                onChange={setView}
                options={[
                  { value: 'grid', label: <LayoutGrid className="h-3.5 w-3.5" /> },
                  { value: 'list', label: <List className="h-3.5 w-3.5" /> },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition',
                categoryFilter === 'all'
                  ? 'border-accent/30 bg-accent-soft text-accent'
                  : 'border-border text-muted hover:bg-surface-2 hover:text-ink',
              )}
            >
              Semua kategori
            </button>
            {(categories ?? []).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition',
                  categoryFilter === category.id
                    ? 'border-transparent bg-surface-2 text-ink'
                    : 'border-border text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCategoryManagerOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[10px] font-semibold text-muted transition hover:border-accent hover:text-accent"
            >
              <Tag className="h-3 w-3" />
              Kelola
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted">
              <button
                type="button"
                onClick={() => setCurrentFolderId(null)}
                className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-semibold transition hover:bg-surface-2 hover:text-ink"
              >
                <Home className="h-3 w-3" />
                Semua file
              </button>
              {path.map((folder) => (
                <span key={folder.id} className="flex min-w-0 items-center gap-1">
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-2" />
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="max-w-[140px] truncate rounded-lg px-1.5 py-1 font-semibold transition hover:bg-surface-2 hover:text-ink"
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setCategoryFilter('all')
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"
                >
                  <X className="h-3 w-3" />
                  Reset
                </button>
              ) : null}
              <span className="text-[10px] text-muted-2">
                {totalFiles} file · {folders?.length ?? 0} folder
              </span>
            </div>
          </div>
          {query ? (
            <p className="text-[10px] text-muted-2">
              Menampilkan hasil pencarian dari semua folder ({visibleFiles.length} file).
            </p>
          ) : null}
        </div>

        <div className="p-3 sm:p-4">
          {isEmpty ? (
            <EmptyState
              icon={FolderOpen}
              title={filtersActive ? 'Tidak ada file yang cocok' : 'Folder ini masih kosong'}
              description={
                filtersActive
                  ? 'Coba kata kunci lain atau reset filter kategori.'
                  : 'Upload file sekolah atau buat subfolder untuk mulai mengorganisasi.'
              }
              action={
                filtersActive ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSearch('')
                      setCategoryFilter('all')
                    }}
                  >
                    Reset filter
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setCreateFolderOpen(true)}>
                      Buat folder
                    </Button>
                    <Button size="sm" onClick={() => setUploadState({})}>
                      Upload file
                    </Button>
                  </div>
                )
              }
            />
          ) : view === 'grid' ? (
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {subfolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative rounded-2xl border border-border bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft"
                >
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="flex w-full items-start gap-3 pr-6 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
                      <Folder className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">{folder.name}</span>
                      <span className="mt-0.5 block text-[10px] text-muted">
                        {folderFileCounts.get(folder.id) ?? 0} file langsung
                      </span>
                    </span>
                  </button>
                  <div className="absolute right-1.5 top-1.5">
                    <Menu items={folderMenuItems(folder)} />
                  </div>
                </div>
              ))}
              {visibleFiles.map((file) => {
                const category = categoryMap.get(file.categoryId)
                const subject = file.subjectId ? subjectMap.get(file.subjectId) : undefined
                return (
                  <div
                    key={file.id}
                    className="group relative rounded-2xl border border-border bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft"
                  >
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => setPreviewFile(file)} className="shrink-0">
                        <FileTypeIcon ext={file.ext} size={40} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="min-w-0 flex-1 pr-6 text-left"
                      >
                        <span className="block truncate text-xs font-semibold text-ink">
                          {file.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-muted">
                          {formatBytes(file.size)} · {formatDateISO(file.createdAt.slice(0, 10))}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1">
                          {category ? (
                            <Badge color={category.color} soft={`${category.color}18`}>
                              {category.name}
                            </Badge>
                          ) : null}
                          {subject ? <Badge variant="neutral">{subject.name}</Badge> : null}
                        </span>
                        {query ? (
                          <span className="mt-1 block truncate text-[9px] text-muted-2">
                            {folderLocation(file)}
                          </span>
                        ) : null}
                      </button>
                      <div className="absolute right-1.5 top-1.5">
                        <Menu items={fileMenuItems(file)} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="hidden items-center gap-3 border-b border-border bg-surface-2/60 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-muted-2 sm:flex">
                <span className="flex-1">Nama</span>
                <span className="w-20 text-right">Ukuran</span>
                <span className="w-28">Diunggah</span>
                <span className="w-40">Lokasi</span>
                <span className="w-8" />
              </div>
              {subfolders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2.5 transition last:border-b-0 hover:bg-surface-2/40"
                >
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                      <Folder className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">{folder.name}</span>
                      <span className="text-[9px] text-muted">
                        {folderFileCounts.get(folder.id) ?? 0} file langsung
                      </span>
                    </span>
                  </button>
                  <span className="hidden w-20 text-right text-[10px] text-muted-2 sm:block">—</span>
                  <span className="hidden w-28 text-[10px] text-muted-2 sm:block">Folder</span>
                  <span className="hidden w-40 truncate text-[10px] text-muted-2 lg:block">—</span>
                  <div className="w-8 shrink-0">
                    <Menu items={folderMenuItems(folder)} />
                  </div>
                </div>
              ))}
              {visibleFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2.5 transition last:border-b-0 hover:bg-surface-2/40"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <FileTypeIcon ext={file.ext} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-ink">{file.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-[9px] text-muted">
                          {categoryMap.get(file.categoryId)?.name ?? 'Other'}
                        </span>
                        {file.subjectId && subjectMap.get(file.subjectId) ? (
                          <span className="text-[9px] text-muted-2">
                            · {subjectMap.get(file.subjectId)?.name}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                  <span className="hidden w-20 text-right text-[10px] text-muted sm:block">
                    {formatBytes(file.size)}
                  </span>
                  <span className="hidden w-28 text-[10px] text-muted sm:block">
                    {formatDateISO(file.createdAt.slice(0, 10))}
                  </span>
                  <span className="hidden w-40 truncate text-[10px] text-muted-2 lg:block">
                    {folderLocation(file)}
                  </span>
                  <div className="w-8 shrink-0">
                    <Menu items={fileMenuItems(file)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <p className="flex items-center gap-1.5 text-[10px] text-muted-2">
        <FolderOpen className="h-3 w-3" />
        File disimpan sebagai blob di IndexedDB perangkat ini — tetap tersedia setelah refresh atau
        browser ditutup.
      </p>

      {uploadState ? (
        <FileUploadModal
          folderId={currentFolderId}
          folderLabel={currentLabel}
          initialFiles={uploadState.initialFiles}
          onClose={() => setUploadState(null)}
        />
      ) : null}

      {previewFile ? (
        <FilePreviewModal
          file={previewFile}
          folderLabel={folderLocation(previewFile)}
          onClose={() => setPreviewFile(null)}
        />
      ) : null}

      {createFolderOpen ? (
        <NameDialog
          title="Folder baru"
          description={`Dibuat di ${currentLabel}`}
          label="Nama folder"
          submitLabel="Buat folder"
          onSubmit={async (name) => {
            await createFolder(name, currentFolderId)
            toast.success('Folder dibuat')
          }}
          onClose={() => setCreateFolderOpen(false)}
        />
      ) : null}

      {renameTarget ? (
        <NameDialog
          title={renameTarget.type === 'file' ? 'Rename file' : 'Rename folder'}
          description={renameTarget.name}
          label="Nama baru"
          initialValue={renameTarget.name}
          submitLabel="Simpan"
          onSubmit={async (name) => {
            if (renameTarget.type === 'file') {
              await renameFile(renameTarget.id, name)
            } else {
              await renameFolder(renameTarget.id, name)
            }
            toast.success('Nama diperbarui')
          }}
          onClose={() => setRenameTarget(null)}
        />
      ) : null}

      {moveTarget ? (
        <MoveFileDialog file={moveTarget} folders={folders ?? []} onClose={() => setMoveTarget(null)} />
      ) : null}

      {categoryManagerOpen ? (
        <CategoryManagerModal files={files ?? []} onClose={() => setCategoryManagerOpen(false)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'folder' ? 'Hapus folder ini?' : 'Hapus file ini?'}
        description={
          deleteTarget?.type === 'folder'
            ? `Folder "${deleteTarget.folder?.name ?? ''}" beserta ${deleteTarget.fileCount} file di dalamnya akan dihapus permanen. Subfolder juga ikut terhapus.`
            : `"${deleteTarget?.file?.name ?? ''}" akan dihapus permanen dari penyimpanan lokal.`
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
