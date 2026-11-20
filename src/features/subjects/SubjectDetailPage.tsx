import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Download,
  FolderClosed,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '@/db'
import { DeadlineBadge, PriorityBadge, StatusBadge } from '@/components/assignments/AssignmentBadges'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileTypeIcon } from '@/components/ui/FileTypeIcon'
import { Skeleton } from '@/components/ui/Skeleton'
import { SubjectFormModal } from '@/features/subjects/SubjectFormModal'
import { usePreferences } from '@/hooks/useProfile'
import { formatBytes } from '@/lib/files'
import { WEEKDAY_LABELS, formatDateISO, formatTimeLabel, toMinutes } from '@/lib/time'
import { deleteSubject } from '@/services/subjects'
import { downloadFile } from '@/services/files'
import { toast } from '@/stores/toast-store'

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const prefs = usePreferences()
  const data = useLiveQuery(async () => {
    if (!id) return { subject: undefined, ready: true }
    const subject = await db.subjects.get(id)
    return { subject, ready: true }
  }, [id])
  const assignments = useLiveQuery(
    async () => (id ? db.assignments.where('subjectId').equals(id).toArray() : []),
    [id],
  )
  const files = useLiveQuery(
    async () => (id ? db.files.where('subjectId').equals(id).toArray() : []),
    [id],
  )
  const slots = useLiveQuery(
    async () => (id ? db.schedule.where('subjectId').equals(id).toArray() : []),
    [id],
  )
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const sortedAssignments = useMemo(
    () =>
      [...(assignments ?? [])].sort((a, b) =>
        `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`),
      ),
    [assignments],
  )
  const sortedSlots = useMemo(
    () =>
      [...(slots ?? [])].sort(
        (a, b) => a.weekday - b.weekday || toMinutes(a.startTime) - toMinutes(b.startTime),
      ),
    [slots],
  )
  const sortedFiles = useMemo(
    () => [...(files ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [files],
  )

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-44" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data.subject) {
    return (
      <div className="space-y-4">
        <Link
          to="/subjects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke My Subjects
        </Link>
        <Card className="p-6">
          <EmptyState
            icon={BookOpen}
            title="Mata pelajaran tidak ditemukan"
            description="Mungkin mapel ini sudah dihapus. Kembali ke daftar untuk melihat mapel lain."
            action={
              <Button size="sm" onClick={() => navigate('/subjects')}>
                Lihat semua mapel
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const subject = data.subject

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link
        to="/subjects"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke My Subjects
      </Link>

      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-10 blur-2xl"
          style={{ backgroundColor: subject.color }}
        />
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: subject.color }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
              style={{ backgroundColor: `${subject.color}18`, color: subject.color }}
            >
              {subject.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {subject.name}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                {subject.description || 'Belum ada deskripsi untuk mata pelajaran ini.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-muted">
                <span className="rounded-full bg-surface-2 px-2.5 py-1">
                  {sortedAssignments.length} tugas
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1">
                  {sortedSlots.length} jadwal
                </span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1">
                  {sortedFiles.length} file
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setDeleting(true)}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              Hapus
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Tugas"
            description={`${sortedAssignments.length} tugas terhubung`}
            action={
              <Link
                to="/assignments?new=1"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-accent transition hover:bg-accent-soft"
              >
                <Plus className="h-3 w-3" />
                Tambah
              </Link>
            }
          />
          <CardContent className="space-y-2 pt-4">
            {sortedAssignments.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Belum ada tugas"
                description="Tugas untuk mapel ini akan muncul di sini."
                compact
              />
            ) : (
              sortedAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  to="/assignments"
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 transition hover:border-border-strong hover:bg-surface-2/50"
                >
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{assignment.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={assignment.priority} />
                      <StatusBadge status={assignment.status} />
                      <span className="text-[9px] text-muted">
                        {formatDateISO(assignment.dueDate)} ·{' '}
                        {formatTimeLabel(assignment.dueTime, prefs.timeFormat)}
                      </span>
                    </div>
                  </div>
                  <DeadlineBadge assignment={assignment} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Jadwal mingguan"
              description={`${sortedSlots.length} slot pelajaran`}
              action={<CalendarDays className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-2 pt-4">
              {sortedSlots.length === 0 ? (
                <EmptyState
                  icon={CalendarPlus}
                  title="Belum ada jadwal"
                  description="Tambahkan jadwal untuk mapel ini di halaman Schedule."
                  compact
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/schedule?new=1')}
                    >
                      Atur jadwal
                    </Button>
                  }
                />
              ) : (
                sortedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <span
                      className="h-7 w-1 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">{WEEKDAY_LABELS[slot.weekday]}</p>
                      <p className="text-[10px] text-muted">{slot.room || 'Ruang belum diatur'}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-muted">
                      <Clock3 className="h-3 w-3" />
                      {formatTimeLabel(slot.startTime, prefs.timeFormat)}–
                      {formatTimeLabel(slot.endTime, prefs.timeFormat)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="File"
              description={`${sortedFiles.length} file terhubung`}
              action={
                <Link
                  to="/files"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-accent transition hover:bg-accent-soft"
                >
                  <FolderClosed className="h-3 w-3" />
                  File Manager
                </Link>
              }
            />
            <CardContent className="space-y-2 pt-4">
              {sortedFiles.length === 0 ? (
                <EmptyState
                  icon={FolderClosed}
                  title="Belum ada file"
                  description="Upload file dan hubungkan ke mapel ini lewat File Manager."
                  compact
                />
              ) : (
                sortedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2.5 rounded-xl border border-border px-2.5 py-2"
                  >
                    <FileTypeIcon ext={file.ext} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-ink">{file.name}</p>
                      <p className="text-[9px] text-muted">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void downloadFile(file).catch((error) =>
                          toast.error('Gagal mengunduh file', error instanceof Error ? error.message : undefined),
                        )
                      }}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-accent"
                      aria-label={`Unduh ${file.name}`}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {editing ? <SubjectFormModal subject={subject} onClose={() => setEditing(false)} /> : null}

      <ConfirmDialog
        open={deleting}
        title="Hapus mata pelajaran?"
        description={`"${subject.name}" akan dihapus bersama ${sortedSlots.length} jadwal terkait. ${sortedAssignments.length} tugas dan ${sortedFiles.length} file tetap tersimpan dengan label "Tanpa mapel".`}
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          await deleteSubject(subject.id)
          toast.success('Mata pelajaran dihapus')
          navigate('/subjects')
        }}
      />
    </div>
  )
}
