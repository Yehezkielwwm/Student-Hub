import { addDays, format, formatDistanceToNow, startOfWeek } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import type { ScheduleSlot, TimeFormat, Weekday } from '@/types/models'

export const WEEKDAY_LABELS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const

export const WEEKDAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: Weekday
  dateISO: string
  secondsOfDay: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getZonedFormatter(timeZone: string) {
  const cached = formatterCache.get(timeZone)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  formatterCache.set(timeZone, formatter)
  return formatter
}

export function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
  } catch {
    return 'Asia/Jakarta'
  }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getZonedFormatter(timeZone).formatToParts(date)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  const year = Number(map.year)
  const month = Number(map.month)
  const day = Number(map.day)
  const hour = Number(map.hour) % 24
  const minute = Number(map.minute)
  const second = Number(map.second)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    dateISO: `${year}-${pad2(month)}-${pad2(day)}`,
    secondsOfDay: hour * 3600 + minute * 60 + second,
  }
}

export function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

export function fromMinutes(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`
}

export function formatTimeLabel(time: string, timeFormat: TimeFormat) {
  const [rawH, rawM] = time.split(':').map(Number)
  const h = Number.isFinite(rawH) ? rawH : 0
  const m = Number.isFinite(rawM) ? rawM : 0
  if (timeFormat === '12h') {
    const suffix = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${pad2(m)} ${suffix}`
  }
  return `${pad2(h)}:${pad2(m)}`
}

export function formatClock(parts: ZonedParts, timeFormat: TimeFormat) {
  const time =
    timeFormat === '12h'
      ? `${parts.hour % 12 || 12}:${pad2(parts.minute)}:${pad2(parts.second)}`
      : `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
  if (timeFormat === '12h') return `${time} ${parts.hour >= 12 ? 'PM' : 'AM'}`
  return time
}

export function formatLongDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateISO(dateISO: string, style: 'short' | 'long' = 'short') {
  if (!dateISO) return '—'
  const [y, m, d] = dateISO.split('-').map(Number)
  if (!y || !m || !d) return '—'
  const date = new Date(y, m - 1, d)
  if (style === 'long') return format(date, 'EEEE, d MMMM yyyy', { locale: localeID })
  return format(date, 'd MMM yyyy', { locale: localeID })
}

export function timeAgo(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return formatDistanceToNow(date, { addSuffix: true, locale: localeID })
}

export function formatDateTimeISO(iso: string, style: 'short' | 'long' = 'short') {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return style === 'long'
    ? format(date, 'EEEE, d MMMM yyyy · HH:mm', { locale: localeID })
    : format(date, 'd MMM yyyy · HH:mm', { locale: localeID })
}

export function zonedDateTimeToDate(dateISO: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const targetAsUtc = Date.UTC(year || 1970, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0)
  let guess = targetAsUtc
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(new Date(guess), timeZone)
    const wallAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    const diff = targetAsUtc - wallAsUtc
    if (Math.abs(diff) < 1000) break
    guess += diff
  }
  return new Date(guess)
}

export type SlotStatus = 'live' | 'upcoming' | 'done' | 'other'

export function getSlotStatus(slot: ScheduleSlot, parts: ZonedParts): SlotStatus {
  if (slot.weekday !== parts.weekday) return 'other'
  const start = toMinutes(slot.startTime) * 60
  const end = toMinutes(slot.endTime) * 60
  if (parts.secondsOfDay < start) return 'upcoming'
  if (parts.secondsOfDay < end) return 'live'
  return 'done'
}

export interface NextClassInfo {
  slot: ScheduleSlot
  msUntil: number
  daysAhead: number
}

export function getNextClass(slots: ScheduleSlot[], parts: ZonedParts): NextClassInfo | null {
  for (let offset = 0; offset < 8; offset += 1) {
    const weekday = ((parts.weekday + offset) % 7) as Weekday
    const candidates = slots
      .filter((slot) => slot.weekday === weekday)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    for (const slot of candidates) {
      const diff = offset * 86400 + toMinutes(slot.startTime) * 60 - parts.secondsOfDay
      if (diff > 0) return { slot, msUntil: diff * 1000, daysAhead: offset }
    }
  }
  return null
}

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

export function countdownParts(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    totalMs: ms,
  }
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return 'Sekarang'
  const { days, hours, minutes, seconds } = countdownParts(ms)
  if (days > 0) return `${days} hari ${hours} jam`
  if (hours > 0) return `${hours} jam ${minutes} menit`
  if (minutes > 0) return `${minutes} menit ${seconds} detik`
  return `${seconds} detik`
}

export function formatClockCountdown(ms: number) {
  if (ms <= 0) return '00:00:00'
  const { days, hours, minutes, seconds } = countdownParts(ms)
  const base = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  return days > 0 ? `${days} hari ${base}` : base
}

export function formatDeadlineDistance(ms: number) {
  const abs = Math.abs(ms)
  const { days, hours, minutes } = countdownParts(abs)
  const suffix = days > 0 ? `${days} hari` : hours > 0 ? `${hours} jam` : `${Math.max(1, minutes)} menit`
  return ms < 0 ? `Terlambat ${suffix}` : `${suffix} lagi`
}

export function getWeekStart(date: Date, weekStartsOn: 0 | 1) {
  return startOfWeek(date, { weekStartsOn })
}

export function weekdayOrder(weekStartsOn: 0 | 1): Weekday[] {
  const order: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
  if (weekStartsOn === 1) return [...order.slice(1), 0]
  return order
}

export function weekLabel(date: Date) {
  return format(date, 'd MMM', { locale: localeID })
}

export function addDaysToISO(dateISO: string, days: number) {
  const [y, m, d] = dateISO.split('-').map(Number)
  const date = addDays(new Date(y, m - 1, d), days)
  return format(date, 'yyyy-MM-dd')
}

export function startOfDay(dateISO: string) {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isSameISODate(a: string, b: string) {
  return a === b
}

export function recurrenceLabel(recurrence: 'none' | 'daily' | 'weekly') {
  if (recurrence === 'daily') return 'Setiap hari'
  if (recurrence === 'weekly') return 'Setiap minggu'
  return 'Sekali'
}

export const TIMEZONE_OPTIONS: string[] = [
  'Asia/Jakarta',
  'Asia/Bangkok',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Australia/Perth',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'UTC',
]
