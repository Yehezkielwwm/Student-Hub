import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { addDays, format, startOfWeek, subWeeks } from 'date-fns'
import {
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FolderUp,
  ListChecks,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { db } from '@/db'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Progress } from '@/components/ui/Progress'
import { useClock } from '@/hooks/useClock'
import { usePreferences, useSubjects } from '@/hooks/useProfile'
import { isAssignmentDueSoon } from '@/lib/assignments'
import { WEEKDAY_SHORT, formatDateISO, weekLabel } from '@/lib/time'
import { cn, percent } from '@/lib/utils'
import type { ActivityType, Subject } from '@/types/models'

interface BarDatum {
  label: string
  value: number
  hint?: string
}

function BarChart({ data, color = 'var(--accent)' }: { data: BarDatum[]; color?: string }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  return (
    <div className="flex h-44 items-end gap-1.5 sm:gap-2">
      {data.map((item, index) => {
        const height = item.value === 0 ? 3 : Math.max(8, (item.value / max) * 100)
        return (
          <div key={`${item.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[9px] font-bold tabular-nums text-ink">
              {item.value > 0 ? item.value : ''}
            </span>
            <div
              className="relative flex w-full flex-1 items-end"
              title={`${item.label}: ${item.value}${item.hint ? ` ${item.hint}` : ''}`}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: index * 0.03, ease: 'easeOut' }}
                className="w-full rounded-t-md"
                style={{ backgroundColor: color, opacity: item.value === 0 ? 0.2 : 1 }}
              />
            </div>
            <span className="truncate text-[9px] text-muted-2">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({
  items,
  total,
}: {
  items: Array<{ name: string; value: number; color: string }>
  total: number
}) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[132px] w-[132px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
          {items.map((item) => {
            const fraction = total > 0 ? item.value / total : 0
            const dash = fraction * circumference
            const element = (
              <circle
                key={item.name}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset * circumference}
                className="transition-all duration-500"
              />
            )
            offset += fraction
            return element
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-ink">{total}</span>
          <span className="text-[9px] text-muted">tugas</span>
        </div>
      </div>
      <div className="w-full min-w-0 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted">Belum ada data.</p>
        ) : (
          items.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted">
                {item.name}
              </span>
              <span className="text-[10px] font-bold text-ink">{item.value}</span>
              <span className="w-8 text-right text-[9px] text-muted-2">
                {percent(item.value, total)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  caption: string
  icon: typeof CheckCircle2
  tone: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-muted">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-2">{caption}</p>
    </Card>
  )
}

export default function AnalyticsPage() {
  const prefs = usePreferences()
  const { now } = useClock()
  const subjects = useSubjects()
  const assignments = useLiveQuery(() => db.assignments.toArray(), [])
  const activity = useLiveQuery(() => db.activity.toArray(), [])

  const subjectMap = useMemo(
    () => new Map((subjects ?? []).map((subject) => [subject.id, subject])),
    [subjects],
  )

  const all = assignments ?? []
  const completed = all.filter((assignment) => assignment.status === 'completed')
  const pending = all.filter((assignment) => assignment.status !== 'completed')
  const completion = percent(completed.length, all.length)

  const weekly = useMemo(() => {
    const currentWeek = startOfWeek(now, { weekStartsOn: prefs.weekStartsOn })
    return Array.from({ length: 8 }, (_, index) => {
      const weekStart = subWeeks(currentWeek, 7 - index)
      const weekEnd = addDays(weekStart, 7)
      const count = completed.filter((assignment) => {
        if (!assignment.completedAt) return false
        const time = new Date(assignment.completedAt).getTime()
        return time >= weekStart.getTime() && time < weekEnd.getTime()
      }).length
      return { label: weekLabel(weekStart), value: count }
    })
  }, [completed, now, prefs.weekStartsOn])

  const subjectDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const assignment of all) {
      const key = assignment.subjectId || 'none'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([id, value]) => {
        const subject: Subject | undefined = subjectMap.get(id)
        return {
          name: subject?.name ?? 'Tanpa mapel',
          value,
          color: subject?.color ?? 'var(--muted-2)',
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [all, subjectMap])

  const activityDays = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index - 6)
      const key = format(date, 'yyyy-MM-dd')
      const entries = (activity ?? []).filter((entry) => entry.date === key)
      return {
        label: WEEKDAY_SHORT[date.getDay()],
        value: entries.length,
        key,
        entries,
      }
    })
  }, [activity, now])

  const activityTotals = useMemo(() => {
    const keys = new Set(activityDays.map((day) => day.key))
    const relevant = (activity ?? []).filter((entry) => keys.has(entry.date))
    const count = (type: ActivityType) => relevant.filter((entry) => entry.type === type).length
    return {
      assignments: count('assignment_completed'),
      files: count('file_uploaded'),
      reminders: count('reminder_completed'),
      total: relevant.length,
    }
  }, [activity, activityDays])

  const busiestSubject = subjectDistribution[0]
  const averagePerWeek = weekly.reduce((sum, week) => sum + week.value, 0) / 8
  const dueSoonCount = pending.filter((assignment) =>
    isAssignmentDueSoon(assignment, prefs.timezone, now, 48),
  ).length

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Analytics"
        description="Lihat ritme produktivitasmu dari tugas yang selesai, distribusi mapel, dan aktivitas mingguan."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Tugas selesai"
          value={completed.length}
          caption={`dari ${all.length} tugas`}
          icon={CheckCircle2}
          tone="bg-success-soft text-success"
        />
        <StatCard
          label="Belum selesai"
          value={pending.length}
          caption={`${dueSoonCount} deadline dalam 48 jam`}
          icon={CircleDashed}
          tone="bg-warning-soft text-warning"
        />
        <StatCard
          label="Persentase selesai"
          value={`${completion}%`}
          caption="tingkat penyelesaian"
          icon={TrendingUp}
          tone="bg-accent-soft text-accent"
        />
        <StatCard
          label="Aktivitas 7 hari"
          value={activityTotals.total}
          caption="tugas, file, pengingat"
          icon={Sparkles}
          tone="bg-surface-2 text-muted"
        />
      </div>

      <Card>
        <CardHeader
          title="Progres penyelesaian"
          description={`${completed.length} dari ${all.length} tugas telah diselesaikan`}
          action={<Badge variant={completion >= 70 ? 'success' : completion >= 40 ? 'warning' : 'neutral'}>{completion}%</Badge>}
        />
        <CardContent className="pt-4">
          <Progress value={completion} className="h-2.5" />
          <div className="mt-2 flex justify-between text-[10px] text-muted-2">
            <span>{pending.length} tugas aktif tersisa</span>
            <span>{completed.length} selesai</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Tugas selesai per minggu"
            description="8 minggu terakhir berdasarkan waktu penyelesaian"
            action={<BarChart3 className="h-4 w-4 text-muted" />}
          />
          <CardContent className="pt-5">
            <BarChart data={weekly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Distribusi mapel" description="Semua tugas berdasarkan mapel" />
          <CardContent className="pt-4">
            {all.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Belum ada tugas"
                description="Tambahkan tugas untuk melihat distribusi mapel."
                compact
              />
            ) : (
              <DonutChart items={subjectDistribution} total={all.length} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Aktivitas mingguan"
            description="Tugas selesai, file diunggah, dan pengingat"
            action={<Clock3 className="h-4 w-4 text-muted" />}
          />
          <CardContent className="pt-5">
            <BarChart
              data={activityDays.map((day) => ({ label: day.label, value: day.value }))}
              color="var(--success)"
            />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-surface-2/60 px-2.5 py-2">
                <p className="flex items-center gap-1 text-[9px] text-muted">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Tugas
                </p>
                <p className="text-sm font-bold text-ink">{activityTotals.assignments}</p>
              </div>
              <div className="rounded-xl bg-surface-2/60 px-2.5 py-2">
                <p className="flex items-center gap-1 text-[9px] text-muted">
                  <FolderUp className="h-2.5 w-2.5" />
                  File
                </p>
                <p className="text-sm font-bold text-ink">{activityTotals.files}</p>
              </div>
              <div className="rounded-xl bg-surface-2/60 px-2.5 py-2">
                <p className="flex items-center gap-1 text-[9px] text-muted">
                  <Clock3 className="h-2.5 w-2.5" />
                  Pengingat
                </p>
                <p className="text-sm font-bold text-ink">{activityTotals.reminders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Ringkasan" description="Pola belajar yang terlihat dari datamu" />
          <CardContent className="space-y-2.5 pt-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
              <div>
                <p className="text-[10px] text-muted">Rata-rata tugas selesai / minggu</p>
                <p className="text-lg font-bold text-ink">{averagePerWeek.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
              <div>
                <p className="text-[10px] text-muted">Mapel dengan tugas terbanyak</p>
                <p className="text-sm font-bold text-ink">
                  {busiestSubject?.name ?? 'Belum ada data'}
                </p>
              </div>
              {busiestSubject ? (
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: busiestSubject.color }}
                />
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
              <div>
                <p className="text-[10px] text-muted">Tugas paling mendesak</p>
                <p className="truncate text-sm font-bold text-ink">
                  {pending.length > 0
                    ? [...pending].sort((a, b) =>
                        `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`),
                      )[0].title
                    : 'Tidak ada tugas aktif'}
                </p>
                {pending.length > 0 ? (
                  <p className="text-[9px] text-muted-2">
                    Deadline{' '}
                    {formatDateISO(
                      [...pending].sort((a, b) =>
                        `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`),
                      )[0].dueDate,
                    )}
                  </p>
                ) : null}
              </div>
              <Clock3 className="h-4 w-4 text-warning" />
            </div>
            <p className="pt-1 text-[10px] leading-relaxed text-muted-2">
              Data dihitung dari aktivitas lokalmu. Minggu dimulai pada{' '}
              {prefs.weekStartsOn === 1 ? 'Senin' : 'Minggu'}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
