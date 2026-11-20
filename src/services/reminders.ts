import { db } from '@/db'
import type { NewReminderInput, Reminder } from '@/types/models'
import { nowISO, uid } from '@/lib/utils'
import { logActivity } from '@/services/assignments'

export async function createReminder(input: NewReminderInput): Promise<string> {
  if (!input.title.trim()) throw new Error('Judul pengingat wajib diisi.')
  if (!input.dueAt) throw new Error('Waktu pengingat wajib diisi.')
  const timestamp = nowISO()
  const id = uid()
  await db.reminders.add({
    id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    dueAt: input.dueAt,
    assignmentId: input.assignmentId || undefined,
    recurrence: input.recurrence,
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return id
}

export async function updateReminder(id: string, input: NewReminderInput) {
  const existing = await db.reminders.get(id)
  if (!existing) throw new Error('Pengingat tidak ditemukan.')
  await db.reminders.update(id, {
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    dueAt: input.dueAt,
    assignmentId: input.assignmentId || undefined,
    recurrence: input.recurrence,
    notifiedAt: existing.dueAt === input.dueAt ? existing.notifiedAt : undefined,
    completed: false,
    updatedAt: nowISO(),
  })
}

export async function toggleReminderCompleted(id: string) {
  const existing = await db.reminders.get(id)
  if (!existing) return
  const completed = !existing.completed
  await db.reminders.update(id, {
    completed,
    updatedAt: nowISO(),
    ...(completed ? {} : { notifiedAt: undefined }),
  })
  if (completed) await logActivity('reminder_completed', id)
}

export async function deleteReminder(id: string) {
  await db.reminders.delete(id)
}

export async function advanceRecurringReminder(reminder: Reminder, now: Date) {
  if (reminder.recurrence === 'none') return
  const step = reminder.recurrence === 'daily' ? 86400000 : 7 * 86400000
  let next = new Date(reminder.dueAt)
  let guard = 0
  while (next.getTime() <= now.getTime() && guard < 500) {
    next = new Date(next.getTime() + step)
    guard += 1
  }
  await db.reminders.update(reminder.id, {
    dueAt: next.toISOString(),
    notifiedAt: now.toISOString(),
    updatedAt: nowISO(),
  })
}
