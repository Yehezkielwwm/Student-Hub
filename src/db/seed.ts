import { addDays, format } from 'date-fns'
import { db } from '@/db'
import type { Assignment, Reminder, ScheduleSlot, Subject } from '@/types/models'
import { nowISO, uid } from '@/lib/utils'

const SUBJECTS: Subject[] = [
  {
    id: 'sample-matematika',
    name: 'Matematika',
    color: '#4f46e5',
    description: 'Aljabar, geometri, dan kalkulus dasar.',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: 'sample-fisika',
    name: 'Fisika',
    color: '#0ea5e9',
    description: 'Mekanika, gelombang, dan energi.',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: 'sample-informatika',
    name: 'Informatika',
    color: '#8b5cf6',
    description: 'Logika pemrograman dan dasar web.',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: 'sample-inggris',
    name: 'Bahasa Inggris',
    color: '#ec4899',
    description: 'Reading, writing, dan speaking.',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: 'sample-sejarah',
    name: 'Sejarah',
    color: '#f59e0b',
    description: 'Sejarah Indonesia dan dunia.',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
]

const SCHEDULE: Array<Omit<ScheduleSlot, 'createdAt' | 'updatedAt'>> = [
  { id: 'sample-s1', subjectId: 'sample-matematika', weekday: 1, startTime: '07:30', endTime: '09:00', room: 'R-201' },
  { id: 'sample-s2', subjectId: 'sample-informatika', weekday: 1, startTime: '10:00', endTime: '11:30', room: 'Lab Komputer' },
  { id: 'sample-s3', subjectId: 'sample-fisika', weekday: 2, startTime: '08:00', endTime: '09:30', room: 'Lab Fisika' },
  { id: 'sample-s4', subjectId: 'sample-inggris', weekday: 2, startTime: '10:00', endTime: '11:30', room: 'R-105' },
  { id: 'sample-s5', subjectId: 'sample-matematika', weekday: 3, startTime: '07:30', endTime: '09:00', room: 'R-201' },
  { id: 'sample-s6', subjectId: 'sample-sejarah', weekday: 3, startTime: '09:30', endTime: '11:00', room: 'R-302' },
  { id: 'sample-s7', subjectId: 'sample-informatika', weekday: 4, startTime: '07:30', endTime: '09:00', room: 'Lab Komputer' },
  { id: 'sample-s8', subjectId: 'sample-fisika', weekday: 4, startTime: '10:00', endTime: '11:30', room: 'Lab Fisika' },
  { id: 'sample-s9', subjectId: 'sample-inggris', weekday: 5, startTime: '08:00', endTime: '09:30', room: 'R-105' },
  { id: 'sample-s10', subjectId: 'sample-sejarah', weekday: 5, startTime: '10:00', endTime: '11:30', room: 'R-302' },
]

function isoDaysFromNow(days: number) {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}

function assignment(
  id: string,
  title: string,
  subjectId: string,
  dueInDays: number,
  dueTime: string,
  priority: Assignment['priority'],
  status: Assignment['status'],
  description: string,
): Assignment {
  const timestamp = nowISO()
  const completedAt =
    status === 'completed'
      ? addDays(new Date(), -2).toISOString()
      : undefined
  return {
    id,
    title,
    subjectId,
    description,
    priority,
    status,
    dueDate: isoDaysFromNow(dueInDays),
    dueTime,
    notes: '',
    attachmentFileIds: [],
    completedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function loadSampleData() {
  const timestamp = nowISO()
  const subjects = SUBJECTS.map((subject) => ({ ...subject, createdAt: timestamp, updatedAt: timestamp }))
  const slots = SCHEDULE.map((slot) => ({ ...slot, createdAt: timestamp, updatedAt: timestamp }))
  const assignments: Assignment[] = [
    assignment(
      'sample-a1',
      'Latihan soal limit fungsi',
      'sample-matematika',
      1,
      '20:00',
      'high',
      'in_progress',
      'Kerjakan 20 soal limit di buku latihan, lalu foto hasilnya.',
    ),
    assignment(
      'sample-a2',
      'Laporan praktikum gaya gesek',
      'sample-fisika',
      2,
      '23:59',
      'high',
      'not_started',
      'Susun laporan dengan data percobaan dan analisis grafik.',
    ),
    assignment(
      'sample-a3',
      'Membuat landing page sederhana',
      'sample-informatika',
      5,
      '17:00',
      'medium',
      'in_progress',
      'Gunakan HTML dan CSS, upload ke folder Informatika.',
    ),
    assignment(
      'sample-a4',
      'Essay tentang globalisasi',
      'sample-inggris',
      7,
      '23:59',
      'low',
      'not_started',
      'Minimal 400 kata dengan referensi.',
    ),
    assignment(
      'sample-a5',
      'Ringkasan bab kemerdekaan',
      'sample-sejarah',
      -1,
      '18:00',
      'medium',
      'not_started',
      'Buat peta konsep peristiwa sekitar proklamasi.',
    ),
    assignment(
      'sample-a6',
      'Kuis aljabar',
      'sample-matematika',
      -3,
      '09:00',
      'medium',
      'completed',
      'Kuis dikerjakan di kelas.',
    ),
  ]
  const reminders: Reminder[] = [
    {
      id: 'sample-r1',
      title: 'Mulai laporan fisika',
      description: 'Sisihkan 60 menit untuk menyusun laporan praktikum.',
      dueAt: addDays(new Date(), 1).toISOString(),
      assignmentId: 'sample-a2',
      recurrence: 'none',
      completed: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'sample-r2',
      title: 'Cek tugas mingguan',
      description: 'Review semua tugas dan rapikan prioritas.',
      dueAt: addDays(new Date(), 2).toISOString(),
      recurrence: 'weekly',
      completed: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]
  const folders = [
    {
      id: 'sample-folder-1',
      name: 'Semester 1',
      parentId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'sample-folder-2',
      name: 'Catatan',
      parentId: 'sample-folder-1',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'sample-folder-3',
      name: 'Ujian',
      parentId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]

  await db.transaction('rw', db.subjects, db.schedule, db.assignments, db.reminders, db.folders, async () => {
    await db.subjects.bulkPut(subjects)
    await db.schedule.bulkPut(slots)
    await db.assignments.bulkPut(assignments)
    await db.reminders.bulkPut(reminders)
    await db.folders.bulkPut(folders)
  })

  const activityDates = [-3, -6, -8, -10, -13, -16].map((days) => isoDaysFromNow(days))
  const activity = activityDates.map((date, index) => ({
    id: `sample-act-${index}`,
    type: 'assignment_completed' as const,
    refId: 'sample-a6',
    date,
    createdAt: new Date(`${date}T10:00:00`).toISOString(),
  }))
  await db.activity.bulkPut(activity)
  return { subjects: subjects.length, assignments: assignments.length }
}

export async function createWelcomeNotification() {
  const count = await db.notifications.count()
  if (count > 0) return
  await db.notifications.add({
    id: uid(),
    title: 'Selamat datang di Student Hub',
    body: 'Mulai dengan menambahkan jadwal pelajaran dan tugas pertamamu.',
    kind: 'info',
    read: false,
    createdAt: nowISO(),
  })
}
