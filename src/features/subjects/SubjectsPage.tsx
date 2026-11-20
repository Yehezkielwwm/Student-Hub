import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, CalendarDays, ChevronRight, FolderClosed, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { db } from '@/db'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Menu } from '@/components/ui/Menu'
import { PageHeader } from '@/components/ui/PageHeader'
import { SubjectFormModal } from '@/features/subjects/SubjectFormModal'
import { deleteSubject } from '@/services/subjects'
import { toast } from '@/stores/toast-store'
import type { Subject } from '@/types/models'

export default function SubjectsPage() {
  const subjects = useLiveQuery(() => db.subjects.orderBy('name').toArray(), [])
  const assignments = useLiveQuery(() => db.assignments.toArray(), [])
  const files = useLiveQuery(() => db.files.toArray(), [])
  const slots = useLiveQuery(() => db.schedule.toArray(), [])
  const [searchParams, setSearchParams] = useSearchParams()
  const [modal, setModal] = useState<{ subject?: Subject } | null>(null)
  const [deleting, setDeleting] = useState<Subject | null>(null)

  useEffect(() => {
    if (searchParams.get('new')) {
      setModal({})
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const assignmentCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const assignment of assignments ?? []) {
      map.set(assignment.subjectId, (map.get(assignment.subjectId) ?? 0) + 1)
    }
    return map
  }, [assignments])

  const fileCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const file of files ?? []) {
      if (!file.subjectId) continue
      map.set(file.subjectId, (map.get(file.subjectId) ?? 0) + 1)
    }
    return map
  }, [files])

  const slotCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const slot of slots ?? []) {
      map.set(slot.subjectId, (map.get(slot.subjectId) ?? 0) + 1)
    }
    return map
  }, [slots])

  async function handleDelete() {
    if (!deleting) return
    await deleteSubject(deleting.id)
    setDeleting(null)
    toast.success('Mata pelajaran dihapus', 'Jadwal terkait ikut dihapus; tugas dan file tetap tersimpan.')
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="My Subjects"
        description="Kelola mata pelajaran, warna, dan lihat semua tugas, file, serta jadwal yang terhubung."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({})}>
            Tambah mata pelajaran
          </Button>
        }
      />

      {(subjects?.length ?? 0) === 0 ? (
        <Card className="p-4 sm:p-5">
          <EmptyState
            icon={BookOpen}
            title="Belum ada mata pelajaran"
            description="Mata pelajaran menjadi penghubung antara jadwal, tugas, dan file. Tambahkan yang pertama untuk mulai mengorganisasi."
            action={
              <Button size="sm" onClick={() => setModal({})}>
                Tambah mata pelajaran
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(subjects ?? []).map((subject) => (
            <Card key={subject.id} className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card">
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: subject.color }}
              />
              <Link to={`/subjects/${subject.id}`} className="block p-4 pr-12 pt-5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ backgroundColor: `${subject.color}18`, color: subject.color }}
                  >
                    {subject.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{subject.name}</p>
                    <p className="mt-0.5 line-clamp-2 min-h-[32px] text-[11px] leading-relaxed text-muted">
                      {subject.description || 'Belum ada deskripsi.'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg bg-surface-2/70 px-2 py-1.5">
                    <p className="flex items-center gap-1 text-[9px] text-muted">
                      <ListChecks className="h-2.5 w-2.5" />
                      Tugas
                    </p>
                    <p className="text-xs font-bold text-ink">{assignmentCount.get(subject.id) ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-surface-2/70 px-2 py-1.5">
                    <p className="flex items-center gap-1 text-[9px] text-muted">
                      <CalendarDays className="h-2.5 w-2.5" />
                      Jadwal
                    </p>
                    <p className="text-xs font-bold text-ink">{slotCount.get(subject.id) ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-surface-2/70 px-2 py-1.5">
                    <p className="flex items-center gap-1 text-[9px] text-muted">
                      <FolderClosed className="h-2.5 w-2.5" />
                      File
                    </p>
                    <p className="text-xs font-bold text-ink">{fileCount.get(subject.id) ?? 0}</p>
                  </div>
                </div>
                <span className="mt-3 inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent">
                  Lihat detail
                  <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
              <div className="absolute right-2 top-2.5">
                <Menu
                  items={[
                    { label: 'Edit mapel', icon: Pencil, onClick: () => setModal({ subject }) },
                    {
                      label: 'Hapus mapel',
                      icon: Trash2,
                      danger: true,
                      onClick: () => setDeleting(subject),
                    },
                  ]}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal ? <SubjectFormModal subject={modal.subject} onClose={() => setModal(null)} /> : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus mata pelajaran?"
        description={`"${deleting?.name ?? ''}" akan dihapus. Jadwal untuk mapel ini ikut terhapus. Tugas dan file tetap tersimpan dengan label "Tanpa mapel".`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
