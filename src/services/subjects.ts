import { db } from '@/db'
import type { NewSubjectInput, Subject } from '@/types/models'
import { nowISO, uid } from '@/lib/utils'

export async function createSubject(input: NewSubjectInput): Promise<string> {
  const name = input.name.trim()
  if (!name) throw new Error('Nama mata pelajaran wajib diisi.')
  const existing = await db.subjects.where('name').equalsIgnoreCase(name).first()
  if (existing) throw new Error('Mata pelajaran dengan nama tersebut sudah ada.')
  const timestamp = nowISO()
  const id = uid()
  await db.subjects.add({
    id,
    name,
    color: input.color,
    description: input.description?.trim() ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return id
}

export async function updateSubject(
  id: string,
  patch: Partial<Pick<Subject, 'name' | 'color' | 'description'>>,
) {
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new Error('Nama mata pelajaran wajib diisi.')
    const duplicate = await db.subjects.where('name').equalsIgnoreCase(name).first()
    if (duplicate && duplicate.id !== id) {
      throw new Error('Mata pelajaran dengan nama tersebut sudah ada.')
    }
    patch = { ...patch, name }
  }
  await db.subjects.update(id, { ...patch, updatedAt: nowISO() })
}

export async function deleteSubject(id: string) {
  await db.transaction('rw', db.subjects, db.schedule, db.assignments, db.files, async () => {
    await db.subjects.delete(id)
    await db.schedule.where('subjectId').equals(id).delete()
    await db.assignments
      .where('subjectId')
      .equals(id)
      .modify({ subjectId: '', updatedAt: nowISO() })
    await db.files
      .where('subjectId')
      .equals(id)
      .modify({ subjectId: undefined, updatedAt: nowISO() })
  })
}
