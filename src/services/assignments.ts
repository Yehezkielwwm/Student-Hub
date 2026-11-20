import { db } from '@/db'
import type { Assignment, NewAssignmentInput } from '@/types/models'
import { nowISO, uid } from '@/lib/utils'

export async function logActivity(
  type: 'assignment_completed' | 'file_uploaded' | 'reminder_completed',
  refId: string,
) {
  const date = new Date()
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
  await db.activity.add({
    id: uid(),
    type,
    refId,
    date: dateKey,
    createdAt: nowISO(),
  })
}

export async function createAssignment(input: NewAssignmentInput): Promise<string> {
  if (!input.title.trim()) throw new Error('Nama tugas wajib diisi.')
  if (!input.subjectId) throw new Error('Pilih mata pelajaran terlebih dahulu.')
  if (!input.dueDate) throw new Error('Tanggal deadline wajib diisi.')
  if (!input.dueTime) throw new Error('Jam deadline wajib diisi.')
  const timestamp = nowISO()
  const id = uid()
  await db.assignments.add({
    id,
    title: input.title.trim(),
    subjectId: input.subjectId,
    description: input.description?.trim() ?? '',
    priority: input.priority,
    status: input.status,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    notes: input.notes?.trim() ?? '',
    attachmentFileIds: input.attachmentFileIds ?? [],
    completedAt: input.status === 'completed' ? timestamp : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  if (input.status === 'completed') await logActivity('assignment_completed', id)
  return id
}

export async function updateAssignment(id: string, input: NewAssignmentInput) {
  const existing = await db.assignments.get(id)
  if (!existing) throw new Error('Tugas tidak ditemukan.')
  const timestamp = nowISO()
  const becomesCompleted = input.status === 'completed' && existing.status !== 'completed'
  const reopens = input.status !== 'completed' && existing.status === 'completed'
  const deadlineChanged =
    existing.dueDate !== input.dueDate || existing.dueTime !== input.dueTime
  await db.assignments.update(id, {
    title: input.title.trim(),
    subjectId: input.subjectId,
    description: input.description?.trim() ?? '',
    priority: input.priority,
    status: input.status,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    notes: input.notes?.trim() ?? '',
    attachmentFileIds: input.attachmentFileIds ?? [],
    completedAt: becomesCompleted ? timestamp : reopens ? undefined : existing.completedAt,
    deadlineNotifiedAt: deadlineChanged ? undefined : existing.deadlineNotifiedAt,
    updatedAt: timestamp,
  })
  if (becomesCompleted) await logActivity('assignment_completed', id)
}

export async function setAssignmentStatus(id: string, status: Assignment['status']) {
  const existing = await db.assignments.get(id)
  if (!existing) return
  const becomesCompleted = status === 'completed' && existing.status !== 'completed'
  await db.assignments.update(id, {
    status,
    completedAt: status === 'completed' ? nowISO() : undefined,
    updatedAt: nowISO(),
  })
  if (becomesCompleted) await logActivity('assignment_completed', id)
}

export async function toggleAssignmentCompleted(id: string) {
  const existing = await db.assignments.get(id)
  if (!existing) return
  await setAssignmentStatus(id, existing.status === 'completed' ? 'in_progress' : 'completed')
}

export async function deleteAssignment(id: string) {
  await db.assignments.delete(id)
}
