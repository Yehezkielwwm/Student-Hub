import { db } from '@/db'
import type { NewScheduleInput, ScheduleSlot } from '@/types/models'
import { toMinutes } from '@/lib/time'
import { nowISO, uid } from '@/lib/utils'

function validate(input: NewScheduleInput) {
  if (!input.subjectId) throw new Error('Pilih mata pelajaran terlebih dahulu.')
  if (toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    throw new Error('Jam selesai harus lebih lambat dari jam mulai.')
  }
}

export async function findOverlappingSlot(input: NewScheduleInput, excludeId?: string) {
  const slots = await db.schedule.where('weekday').equals(input.weekday).toArray()
  const start = toMinutes(input.startTime)
  const end = toMinutes(input.endTime)
  return slots.find((slot) => {
    if (slot.id === excludeId) return false
    const slotStart = toMinutes(slot.startTime)
    const slotEnd = toMinutes(slot.endTime)
    return start < slotEnd && end > slotStart
  })
}

export async function createScheduleSlot(input: NewScheduleInput): Promise<string> {
  validate(input)
  const timestamp = nowISO()
  const id = uid()
  await db.schedule.add({
    id,
    subjectId: input.subjectId,
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return id
}

export async function updateScheduleSlot(id: string, input: NewScheduleInput) {
  validate(input)
  await db.schedule.update(id, {
    subjectId: input.subjectId,
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room?.trim() || undefined,
    updatedAt: nowISO(),
  })
}

export async function deleteScheduleSlot(id: string) {
  await db.schedule.delete(id)
}

export function sortSlots(slots: ScheduleSlot[]) {
  return [...slots].sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday
    return toMinutes(a.startTime) - toMinutes(b.startTime)
  })
}
