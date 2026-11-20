import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BellPlus,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileUp,
  ListChecks,
  Plus,
  Sparkles,
  Timer,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@/db'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Progress } from '@/components/ui/Progress'
import { useClock } from '@/hooks/useClock'
import { usePreferences, useProfile, useSubjects } from '@/hooks/useProfile'
import {
  assignmentDeadlineMs,
  isAssignmentDueSoon,
  sortByDeadline,
} from '@/lib/assignments'
import { PRIORITY_META } from '@/lib/constants'
import {
  formatClock,
  formatClockCountdown,
  formatDateISO,
  formatDeadlineDistance,
  formatLongDate,
  formatTimeLabel,
  getNextClass,
  getSlotStatus,
  getZonedParts,
  toMinutes,
} from '@/lib/time'
import { cn, percent } from '@/lib/utils'
import type { Subject } from '@/types/models'

function greetingForHour(hour: number) {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

const TONES = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-surface-2 text-muted',
} as const

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string
  value: number | string
  caption: string
  icon: LucideIcon
  tone: keyof typeof TONES
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="h-full p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-muted">{label}</span>
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2.5 text-2xl font-bold tracking-tight text-ink">{value}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-2">{caption}</p>
      </Card>
    </motion.div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  tone: keyof typeof TONES
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-soft active:translate-y-0"
    >
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-ink">{label}</span>
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const profile = useProfile()
  const prefs = usePreferences()
  const { now, parts, timeZone } = useClock()
  const subjects = useSubjects()
  const slots = useLiveQuery(() => db.schedule.toArray(), [])
  const assignments = useLiveQuery(() => db.assignments.toArray(), [])

  const subjectMap = new Map<string, Subject>((subjects ?? []).map((subject) => [subject.id, subject]))
  const allSlots = slots ?? []
  const allAssignments = assignments ?? []
  const todaySlots = allSlots
    .filter((slot) => slot.weekday === parts.weekday)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  const liveSlot = todaySlots.find((slot) => getSlotStatus(slot, parts) === 'live')
  const nextClass = getNextClass(allSlots, parts)
  const activeAssignments = allAssignments.filter((assignment) => assignment.status !== 'completed')
  const completedAssignments = allAssignments.filter((assignment) => assignment.status === 'completed')
  const dueSoon = activeAssignments.filter((assignment) =>
    isAssignmentDueSoon(assignment, prefs.timezone, now, 48),
  )
  const todayKey = parts.dateISO
  const doneToday = allAssignments.filter(
    (assignment) =>
      assignment.completedAt &&
      getZonedParts(new Date(assignment.completedAt), prefs.timezone).dateISO === todayKey,
  )
  const dueToday = activeAssignments.filter((assignment) => assignment.dueDate === todayKey)
  const dailyTotal = doneToday.length + dueToday.length
  const dailyProgress = dailyTotal > 0 ? percent(doneToday.length, dailyTotal) : 0
  const overallProgress = allAssignments.length
    ? percent(completedAssignments.length, allAssignments.length)
    : 0
  const upcoming = [...activeAssignments].sort(sortByDeadline).slice(0, 4)
  const isEmpty = allSlots.length === 0 && allAssignments.length === 0

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-muted">
                <CalendarClock className="h-3 w-3 text-accent" />
                {formatLongDate(now, timeZone)}
              </span>
              {liveSlot ? (
                <Badge variant="success" className="gap-1.5">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-success" />
                  Kelas berlangsung
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight text-ink sm:text-[32px]">
              {greetingForHour(parts.hour)}, {profile?.name ?? 'Siswa'}.
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              {isEmpty
                ? 'Mari siapkan hari pertamamu — mulai dari jadwal atau tugas pertama.'
                : todaySlots.length > 0
                  ? `Ada ${todaySlots.length} pelajaran dan ${dueToday.length} deadline tugas hari ini. Tetap teratur, satu langkah kecil sekaligus.`
                  : 'Tidak ada pelajaran hari ini. Waktu yang tepat untuk menyelesaikan tugas yang tertunda.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/assignments?new=1')}>
                Tugas baru
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<CalendarPlus className="h-3.5 w-3.5" />}
                onClick={() => navigate('/schedule?new=1')}
              >
                Atur jadwal
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-border bg-surface-2/70 p-4 sm:min-w-[240px]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-accent shadow-soft">
              <Clock3 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-ink sm:text-[28px]">
                {formatClock(parts, prefs.timeFormat)}
              </p>
              <p className="truncate text-[10px] font-medium text-muted">
                {timeZone.replace('_', ' ')}
              </p>
              <p className="text-[10px] text-muted-2">Waktu lokal perangkat</p>
            </div>
          </div>
        </div>
      </section>

      {isEmpty ? (
        <Card className="border-accent/20 bg-accent-soft/40 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-accent shadow-soft">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Student Hub-mu masih kosong</p>
                <p className="mt-0.5 text-xs text-muted">
                  Tambahkan jadwal dan tugas, atau muat data contoh dari Settings untuk melihat
                  semua fitur bekerja.
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button size="sm" variant="secondary" onClick={() => navigate('/schedule?new=1')}>
                Mulai jadwal
              </Button>
              <Button size="sm" onClick={() => navigate('/settings')}>
                Buka Settings
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Pelajaran hari ini"
          value={todaySlots.length}
          caption={todaySlots.length ? 'Lihat timeline di bawah' : 'Hari ini tidak ada kelas'}
          icon={CalendarClock}
          tone="accent"
        />
        <StatCard
          label="Tugas aktif"
          value={activeAssignments.length}
          caption={`${completedAssignments.length} tugas sudah selesai`}
          icon={ListChecks}
          tone="neutral"
        />
        <StatCard
          label="Mendekati deadline"
          value={dueSoon.length}
          caption="Deadline dalam 48 jam ke depan"
          icon={Timer}
          tone="warning"
        />
        <StatCard
          label="Selesai hari ini"
          value={doneToday.length}
          caption={`${overallProgress}% dari seluruh tugas`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Jadwal hari ini"
            description={`${todaySlots.length} pelajaran · ${formatLongDate(now, timeZone).split(',')[0]}`}
            action={
              <Link
                to="/schedule"
                className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent-soft"
              >
                Kelola
                <ChevronRight className="h-3 w-3" />
              </Link>
            }
          />
          <CardContent className="space-y-2.5 pt-4">
            {liveSlot ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success-soft/60 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-success" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink">
                      {subjectMap.get(liveSlot.subjectId)?.name ?? 'Mata pelajaran'} sedang berlangsung
                    </p>
                    <p className="text-[10px] text-muted">
                      Berakhir dalam{' '}
                      {formatClockCountdown(
                        (toMinutes(liveSlot.endTime) * 60 - parts.secondsOfDay) * 1000,
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="success">LIVE</Badge>
              </div>
            ) : nextClass ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                    {nextClass.daysAhead === 0 ? 'Kelas berikutnya' : 'Jadwal terdekat'}
                  </p>
                  <p className="truncate text-xs font-bold text-ink">
                    {subjectMap.get(nextClass.slot.subjectId)?.name ?? 'Mata pelajaran'} ·{' '}
                    {formatTimeLabel(nextClass.slot.startTime, prefs.timeFormat)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-accent">
                    {formatClockCountdown(nextClass.msUntil)}
                  </p>
                  <p className="text-[9px] text-muted-2">menuju kelas</p>
                </div>
              </div>
            ) : null}

            {todaySlots.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="Tidak ada pelajaran hari ini"
                description="Nikmati waktu luangmu, atau tambahkan jadwal baru untuk hari ini."
                compact
                action={
                  <Button size="sm" variant="secondary" onClick={() => navigate('/schedule?new=1')}>
                    Tambah jadwal
                  </Button>
                }
              />
            ) : (
              todaySlots.map((slot) => {
                const subject = subjectMap.get(slot.subjectId)
                const status = getSlotStatus(slot, parts)
                return (
                  <div
                    key={slot.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                      status === 'live'
                        ? 'border-success/30 bg-success-soft/30'
                        : status === 'done'
                          ? 'border-transparent bg-surface-2/30 opacity-60'
                          : 'border-border bg-surface hover:bg-surface-2/50',
                    )}
                  >
                    <div className="w-12 shrink-0 text-right">
                      <p className="text-[11px] font-bold tabular-nums text-ink">
                        {formatTimeLabel(slot.startTime, prefs.timeFormat)}
                      </p>
                      <p className="text-[9px] tabular-nums text-muted-2">
                        {formatTimeLabel(slot.endTime, prefs.timeFormat)}
                      </p>
                    </div>
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: subject?.color ?? 'var(--accent)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">
                        {subject?.name ?? 'Mata pelajaran'}
                      </p>
                      <p className="truncate text-[10px] text-muted">
                        {slot.room || 'Ruang kelas belum diatur'}
                      </p>
                    </div>
                    {status === 'live' ? (
                      <Badge variant="success" className="gap-1.5">
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-success" />
                        LIVE
                      </Badge>
                    ) : status === 'done' ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-muted">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selesai
                      </span>
                    ) : (
                      <Badge variant="neutral">Berikutnya</Badge>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Aksi cepat" description="Tambah sesuatu tanpa berpindah jauh" />
            <CardContent className="grid grid-cols-2 gap-2 pt-4">
              <QuickAction
                icon={ListChecks}
                label="Tambah tugas"
                tone="accent"
                onClick={() => navigate('/assignments?new=1')}
              />
              <QuickAction
                icon={CalendarPlus}
                label="Tambah jadwal"
                tone="success"
                onClick={() => navigate('/schedule?new=1')}
              />
              <QuickAction
                icon={FileUp}
                label="Upload file"
                tone="warning"
                onClick={() => navigate('/files?upload=1')}
              />
              <QuickAction
                icon={BellPlus}
                label="Buat pengingat"
                tone="neutral"
                onClick={() => navigate('/reminders?new=1')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Produktivitas"
              description="Ringkasan progres tugasmu"
              action={<TrendingUp className="h-4 w-4 text-muted" />}
            />
            <CardContent className="pt-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tracking-tight text-ink">
                    {dailyProgress}
                    <span className="text-base font-semibold text-muted">%</span>
                  </p>
                  <p className="text-[10px] text-muted">hari ini</p>
                </div>
                <div className="text-right text-[10px] text-muted">
                  <p>
                    <span className="font-bold text-ink">{doneToday.length}</span> selesai
                  </p>
                  <p>
                    <span className="font-bold text-ink">{dueToday.length}</span> deadline
                  </p>
                </div>
              </div>
              <Progress value={dailyProgress} className="mt-3 h-2.5" />
              <p className="mt-2 text-[10px] leading-relaxed text-muted-2">
                {dailyTotal === 0
                  ? 'Belum ada aktivitas tugas hari ini. Selesaikan satu tugas untuk memulai.'
                  : `${doneToday.length} dari ${dailyTotal} target tugas hari ini sudah selesai.`}
              </p>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-3 py-2">
                <span className="text-[10px] font-medium text-muted">Penyelesaian keseluruhan</span>
                <span className="text-[11px] font-bold text-ink">{overallProgress}%</span>
              </div>
              <Link
                to="/analytics"
                className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline"
              >
                Lihat analitik lengkap
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Deadline terdekat"
          description="Tugas aktif yang perlu perhatian"
          action={
            <Link
              to="/assignments"
              className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent-soft"
            >
              Semua tugas
              <ChevronRight className="h-3 w-3" />
            </Link>
          }
        />
        <CardContent className="pt-4">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak ada tugas aktif"
              description="Semua tugas sudah selesai, atau belum ada tugas yang ditambahkan."
              compact
              action={
                <Button size="sm" variant="secondary" onClick={() => navigate('/assignments?new=1')}>
                  Tambah tugas
                </Button>
              }
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {upcoming.map((assignment) => {
                const subject = subjectMap.get(assignment.subjectId)
                const priority = PRIORITY_META[assignment.priority]
                return (
                  <Link
                    key={assignment.id}
                    to="/assignments"
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition hover:border-border-strong hover:bg-surface-2/50"
                  >
                    <span
                      className="h-7 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: subject?.color ?? 'var(--accent)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{assignment.title}</p>
                      <p className="truncate text-[10px] text-muted">
                        {subject?.name ?? 'Tanpa mapel'} · {formatDateISO(assignment.dueDate)}{' '}
                        {formatTimeLabel(assignment.dueTime, prefs.timeFormat)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge color={priority.color} soft={priority.soft}>
                        {priority.label}
                      </Badge>
                      <span className="text-[9px] font-medium text-muted-2">
                        {formatDeadlineDistance(
                          assignmentDeadlineMs(assignment, prefs.timezone, now),
                        )}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
