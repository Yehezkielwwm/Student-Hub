import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  LayoutGrid,
  List,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { db } from '@/db'
import {
  DeadlineBadge,
  PriorityBadge,
  StatusBadge,
} from '@/components/assignments/AssignmentBadges'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Progress } from '@/components/ui/Progress'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SubjectPicker } from '@/components/ui/SubjectPicker'
import { useClock } from '@/hooks/useClock'
import { usePreferences, useSubjects } from '@/hooks/useProfile'
import {
  isAssignmentOverdue,
  sortByDeadline,
  sortByPriority,
} from '@/lib/assignments'
import { formatDateISO, formatTimeLabel } from '@/lib/time'
import { fileAcceptAttribute, getExtension } from '@/lib/files'
import { cn, percent } from '@/lib/utils'
import {
  createAssignment,
  deleteAssignment,
  setAssignmentStatus,
  toggleAssignmentCompleted,
  updateAssignment,
} from '@/services/assignments'
import { uploadSchoolFile } from '@/services/files'
import { toast } from '@/stores/toast-store'
import type { Assignment, AssignmentStatus, Priority, Subject } from '@/types/models'

const assignmentSchema = z.object({
  title: z.string().trim().min(1, 'Nama tugas wajib diisi.').max(140, 'Maksimal 140 karakter.'),
  subjectId: z.string().min(1, 'Pilih mata pelajaran.'),
  description: z.string().max(2000, 'Maksimal 2000 karakter.').optional(),
  dueDate: z.string().min(1, 'Tanggal deadline wajib diisi.'),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/, 'Jam deadline tidak valid.'),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  notes: z.string().max(2000, 'Maksimal 2000 karakter.').optional(),
})

type FormValues = z.infer<typeof assignmentSchema>

function todayInputValue() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function SubjectChip({ subject }: { subject?: Subject }) {
  return (
    <Badge color={subject?.color ?? 'var(--muted)'} soft={subject ? `${subject.color}18` : 'var(--surface-2)'}>
      {subject?.name ?? 'Tanpa mapel'}
    </Badge>
  )
}

function AssignmentFormModal({
  assignment,
  onClose,
}: {
  assignment?: Assignment
  onClose: () => void
}) {
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const existingFiles = useLiveQuery(
    async () =>
      assignment && assignment.attachmentFileIds.length
        ? await db.files.bulkGet(assignment.attachmentFileIds)
        : [],
    [assignment?.id],
  )
  const [removedFileIds, setRemovedFileIds] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: assignment?.title ?? '',
      subjectId: assignment?.subjectId ?? '',
      description: assignment?.description ?? '',
      dueDate: assignment?.dueDate ?? todayInputValue(),
      dueTime: assignment?.dueTime ?? '23:59',
      priority: assignment?.priority ?? 'medium',
      status: assignment?.status ?? 'not_started',
      notes: assignment?.notes ?? '',
    },
  })

  const keptExisting = (existingFiles ?? []).filter(
    (file): file is NonNullable<typeof file> =>
      Boolean(file) && !removedFileIds.includes(file!.id),
  )

  async function onSubmit(values: FormValues) {
    try {
      setSaving(true)
      const uploadedIds: string[] = []
      for (const file of newFiles) {
        const id = await uploadSchoolFile(file, {
          folderId: null,
          categoryId: 'other',
          subjectId: values.subjectId || undefined,
        })
        uploadedIds.push(id)
      }
      const attachmentFileIds = [
        ...(assignment?.attachmentFileIds ?? []).filter(
          (id) => !removedFileIds.includes(id),
        ),
        ...uploadedIds,
      ]
      const input = {
        title: values.title,
        subjectId: values.subjectId,
        description: values.description ?? '',
        priority: values.priority as Priority,
        status: values.status as AssignmentStatus,
        dueDate: values.dueDate,
        dueTime: values.dueTime,
        notes: values.notes ?? '',
        attachmentFileIds,
      }
      if (assignment) {
        await updateAssignment(assignment.id, input)
        toast.success('Tugas diperbarui')
      } else {
        await createAssignment(input)
        toast.success('Tugas ditambahkan')
      }
      onClose()
    } catch (error) {
      toast.error('Gagal menyimpan tugas', error instanceof Error ? error.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={assignment ? 'Edit tugas' : 'Tambah tugas'}
      description="Lengkapi detail tugas agar mudah diprioritaskan."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" form="assignment-form" loading={saving}>
            Simpan tugas
          </Button>
        </>
      }
    >
      <form id="assignment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nama tugas" error={errors.title?.message}>
          <Input
            {...register('title')}
            placeholder="Contoh: Laporan praktikum fisika"
            autoFocus
            maxLength={140}
          />
        </Field>

        <Controller
          control={control}
          name="subjectId"
          render={({ field, fieldState }) => (
            <SubjectPicker
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Field label="Deskripsi" error={errors.description?.message} hint="Opsional">
          <Textarea
            {...register('description')}
            placeholder="Apa yang perlu dikerjakan?"
            rows={3}
            maxLength={2000}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal deadline" error={errors.dueDate?.message}>
            <Input type="date" {...register('dueDate')} />
          </Field>
          <Field label="Jam deadline" error={errors.dueTime?.message}>
            <Input type="time" {...register('dueTime')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prioritas" error={errors.priority?.message}>
            <Select {...register('priority')}>
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
            </Select>
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select {...register('status')}>
              <option value="not_started">Belum dimulai</option>
              <option value="in_progress">Dikerjakan</option>
              <option value="completed">Selesai</option>
            </Select>
          </Field>
        </div>

        <Field label="Catatan tambahan" error={errors.notes?.message} hint="Opsional">
          <Textarea
            {...register('notes')}
            placeholder="Link referensi, catatan guru, atau pengingat pribadi…"
            rows={2}
            maxLength={2000}
          />
        </Field>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink">Lampiran</p>
          {keptExisting.length > 0 ? (
            <div className="space-y-1.5">
              {keptExisting.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1.5"
                >
                  <FileTypeIcon ext={file.ext} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemovedFileIds((ids) => [...ids, file.id])}
                    className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger"
                    aria-label={`Hapus lampiran ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {newFiles.length > 0 ? (
            <div className="space-y-1.5">
              {newFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-1.5"
                >
                  <FileTypeIcon ext={getExtension(file.name)} size={26} />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink">
                    {file.name}
                  </span>
                  <span className="text-[9px] text-muted-2">baru</span>
                  <button
                    type="button"
                    onClick={() => setNewFiles((files) => files.filter((_, i) => i !== index))}
                    className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger"
                    aria-label={`Batalkan ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2/40 px-3 py-3 text-xs font-medium text-muted transition hover:border-accent hover:text-accent">
            <Paperclip className="h-3.5 w-3.5" />
            Tambah lampiran (PDF, DOCX, gambar, dll.)
            <input
              type="file"
              multiple
              accept={fileAcceptAttribute()}
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                setNewFiles((current) => [...current, ...files])
                event.target.value = ''
              }}
            />
          </label>
          <p className="text-[10px] text-muted-2">
            Lampiran juga muncul di File Manager. Maksimal 25 MB per file.
          </p>
        </div>
      </form>
    </Modal>
  )
}

type SortKey = 'deadline' | 'priority' | 'newest' | 'title'
type ViewMode = 'list' | 'grid'

export default function AssignmentsPage() {
  const prefs = usePreferences()
  const { now } = useClock()
  const subjects = useSubjects()
  const assignments = useLiveQuery(() => db.assignments.toArray(), [])
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [sort, setSort] = useState<SortKey>('deadline')
  const [view, setView] = useState<ViewMode>('list')
  const [modal, setModal] = useState<{ assignment?: Assignment } | null>(null)
  const [deleting, setDeleting] = useState<Assignment | null>(null)

  useEffect(() => {
    if (searchParams.get('new')) {
      setModal({})
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const subjectMap = useMemo(
    () => new Map((subjects ?? []).map((subject) => [subject.id, subject])),
    [subjects],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = (assignments ?? []).filter((assignment) => {
      if (subjectFilter !== 'all' && assignment.subjectId !== subjectFilter) return false
      if (statusFilter !== 'all' && assignment.status !== statusFilter) return false
      if (priorityFilter !== 'all' && assignment.priority !== priorityFilter) return false
      if (query) {
        const haystack = `${assignment.title} ${assignment.description} ${assignment.notes}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
    return result.sort((a, b) => {
      if (sort === 'priority') return sortByPriority(a, b)
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sort === 'title') return a.title.localeCompare(b.title)
      return sortByDeadline(a, b)
    })
  }, [assignments, subjectFilter, statusFilter, priorityFilter, search, sort])

  const all = assignments ?? []
  const active = all.filter((assignment) => assignment.status !== 'completed')
  const inProgress = all.filter((assignment) => assignment.status === 'in_progress')
  const completed = all.filter((assignment) => assignment.status === 'completed')
  const overdue = active.filter((assignment) =>
    isAssignmentOverdue(assignment, prefs.timezone, now),
  )
  const completion = percent(completed.length, all.length)
  const filtersActive =
    search.trim() !== '' ||
    subjectFilter !== 'all' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all'

  function resetFilters() {
    setSearch('')
    setSubjectFilter('all')
    setStatusFilter('all')
    setPriorityFilter('all')
  }

  async function handleDelete() {
    if (!deleting) return
    await deleteAssignment(deleting.id)
    setDeleting(null)
    toast.success('Tugas dihapus')
  }

  function renderAssignment(assignment: Assignment) {
    const subject = subjectMap.get(assignment.subjectId)
    const isCompleted = assignment.status === 'completed'
    return (
      <div
        key={assignment.id}
        className={cn(
          'group rounded-2xl border border-border bg-surface p-3.5 transition-all hover:border-border-strong hover:shadow-soft',
          isCompleted && 'opacity-70',
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => toggleAssignmentCompleted(assignment.id)}
            className="mt-0.5 shrink-0 text-muted-2 transition hover:text-success"
            aria-label={isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
            title={isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModal({ assignment })}
                className={cn(
                  'truncate text-left text-sm font-semibold text-ink transition hover:text-accent',
                  isCompleted && 'line-through',
                )}
              >
                {assignment.title}
              </button>
              <PriorityBadge priority={assignment.priority} />
              <StatusBadge status={assignment.status} />
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
              {assignment.description || 'Belum ada deskripsi.'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SubjectChip subject={subject} />
              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                <Clock3 className="h-3 w-3" />
                {formatDateISO(assignment.dueDate)} ·{' '}
                {formatTimeLabel(assignment.dueTime, prefs.timeFormat)}
              </span>
              <DeadlineBadge assignment={assignment} />
              {assignment.attachmentFileIds.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-2">
                  <Paperclip className="h-3 w-3" />
                  {assignment.attachmentFileIds.length}
                </span>
              ) : null}
            </div>
          </div>
          <Menu
            items={[
              {
                label: 'Edit tugas',
                icon: Pencil,
                onClick: () => setModal({ assignment }),
              },
              {
                label: isCompleted ? 'Tandai belum selesai' : 'Tandai selesai',
                icon: CheckCircle2,
                onClick: () => setStatusAndToast(assignment, isCompleted ? 'in_progress' : 'completed'),
              },
              {
                label: 'Hapus tugas',
                icon: Trash2,
                danger: true,
                onClick: () => setDeleting(assignment),
              },
            ]}
          />
        </div>
      </div>
    )
  }

  function setStatusAndToast(assignment: Assignment, status: AssignmentStatus) {
    void setAssignmentStatus(assignment.id, status).then(() => {
      toast.success(status === 'completed' ? 'Tugas diselesaikan' : 'Status tugas diperbarui')
    })
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Assignments"
        description="Kelola tugas, deadline, prioritas, dan lampiran dalam satu tempat."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({})}>
            Tambah tugas
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Tugas aktif', value: active.length },
          { label: 'Dikerjakan', value: inProgress.length },
          { label: 'Selesai', value: completed.length },
          { label: 'Terlambat', value: overdue.length },
        ].map((stat) => (
          <Card key={stat.label} className="p-3.5">
            <p className="text-[10px] font-semibold text-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-ink">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari tugas, deskripsi, atau catatan…"
                className="pl-9"
                aria-label="Cari tugas"
              />
            </div>
            <div className="flex items-center gap-2">
              <SegmentedControl<ViewMode>
                ariaLabel="Tampilan tugas"
                value={view}
                onChange={setView}
                options={[
                  { value: 'list', label: <List className="h-3.5 w-3.5" /> },
                  { value: 'grid', label: <LayoutGrid className="h-3.5 w-3.5" /> },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              aria-label="Filter mata pelajaran"
            >
              <option value="all">Semua mapel</option>
              {(subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              aria-label="Filter status"
            >
              <option value="all">Semua status</option>
              <option value="not_started">Belum dimulai</option>
              <option value="in_progress">Dikerjakan</option>
              <option value="completed">Selesai</option>
            </Select>
            <Select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}
              aria-label="Filter prioritas"
            >
              <option value="all">Semua prioritas</option>
              <option value="high">Prioritas tinggi</option>
              <option value="medium">Prioritas sedang</option>
              <option value="low">Prioritas rendah</option>
            </Select>
            <Select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Urutkan tugas"
            >
              <option value="deadline">Deadline terdekat</option>
              <option value="priority">Prioritas tertinggi</option>
              <option value="newest">Terbaru dibuat</option>
              <option value="title">Nama A–Z</option>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex flex-1 items-center gap-3">
              <Progress value={completion} className="h-1.5 max-w-xs" />
              <span className="shrink-0 text-[10px] font-semibold text-muted">
                {completion}% selesai
              </span>
            </div>
            {filtersActive ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"
              >
                <X className="h-3 w-3" />
                Reset filter
              </button>
            ) : (
              <span className="text-[10px] text-muted-2">{filtered.length} tugas</span>
            )}
          </div>
        </div>

        <div className={cn('p-3 sm:p-4', view === 'grid' && 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3')}>
          {filtered.length === 0 ? (
            <div className={view === 'grid' ? 'sm:col-span-2 xl:col-span-3' : undefined}>
              <EmptyState
                icon={FileText}
                title={filtersActive ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'}
                description={
                  filtersActive
                    ? 'Coba ubah kata kunci atau reset filter untuk melihat semua tugas.'
                    : 'Tambahkan tugas pertamamu, lengkap dengan deadline, prioritas, dan lampiran.'
                }
                action={
                  filtersActive ? (
                    <Button size="sm" variant="secondary" onClick={resetFilters}>
                      Reset filter
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setModal({})}>
                      Tambah tugas
                    </Button>
                  )
                }
              />
            </div>
          ) : view === 'grid' ? (
            filtered.map(renderAssignment)
          ) : (
            <div className="space-y-2">{filtered.map(renderAssignment)}</div>
          )}
        </div>
      </Card>

      {modal ? (
        <AssignmentFormModal assignment={modal.assignment} onClose={() => setModal(null)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus tugas ini?"
        description={`"${deleting?.title ?? ''}" akan dihapus permanen. File lampiran tetap tersimpan di File Manager.`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
