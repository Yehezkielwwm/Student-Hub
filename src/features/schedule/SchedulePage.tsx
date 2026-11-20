import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarOff, CalendarPlus, Clock3, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SubjectPicker } from '@/components/ui/SubjectPicker'
import { db } from '@/db'
import { useClock } from '@/hooks/useClock'
import { usePreferences, useSubjects } from '@/hooks/useProfile'
import { WEEKDAY_LABELS, WEEKDAY_SHORT, formatClockCountdown, formatTimeLabel, getNextClass, getSlotStatus, toMinutes, weekdayOrder } from '@/lib/time'
import { cn } from '@/lib/utils'
import {
  createScheduleSlot,
  deleteScheduleSlot,
  findOverlappingSlot,
  updateScheduleSlot,
} from '@/services/schedule'
import { toast } from '@/stores/toast-store'
import type { ScheduleSlot, Weekday } from '@/types/models'

const schema = z
  .object({
    subjectId: z.string().min(1, 'Pilih mata pelajaran.'),
    weekday: z.string().min(1, 'Pilih hari.'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam tidak valid.'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam tidak valid.'),
    room: z.string().max(60, 'Maksimal 60 karakter.').optional(),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: 'Jam selesai harus setelah jam mulai.',
    path: ['endTime'],
  })

type FormValues = z.infer<typeof schema>

function ScheduleFormModal({
  slot,
  defaultWeekday,
  onClose,
}: {
  slot?: ScheduleSlot
  defaultWeekday: Weekday
  onClose: () => void
}) {
  const prefs = usePreferences()
  const subjects = useSubjects()
  const [saving, setSaving] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subjectId: slot?.subjectId ?? '',
      weekday: String(slot?.weekday ?? defaultWeekday),
      startTime: slot?.startTime ?? '07:30',
      endTime: slot?.endTime ?? '09:00',
      room: slot?.room ?? '',
    },
  })

  async function onSubmit(values: FormValues) {
    const input = {
      subjectId: values.subjectId,
      weekday: Number(values.weekday) as Weekday,
      startTime: values.startTime,
      endTime: values.endTime,
      room: values.room,
    }
    try {
      setSaving(true)
      const overlap = await findOverlappingSlot(input, slot?.id)
      if (overlap) {
        const overlapSubject = subjects?.find((subject) => subject.id === overlap.subjectId)
        setError('startTime', {
          message: `Bentrok dengan ${overlapSubject?.name ?? 'jadwal lain'} (${overlap.startTime}–${overlap.endTime}).`,
        })
        return
      }
      if (slot) {
        await updateScheduleSlot(slot.id, input)
        toast.success('Jadwal diperbarui')
      } else {
        await createScheduleSlot(input)
        toast.success('Jadwal ditambahkan')
      }
      onClose()
    } catch (error) {
      toast.error('Gagal menyimpan jadwal', error instanceof Error ? error.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={slot ? 'Edit jadwal' : 'Tambah jadwal'}
      description="Jadwal berlaku setiap minggu pada hari yang dipilih."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" form="schedule-form" loading={saving}>
            Simpan jadwal
          </Button>
        </>
      }
    >
      <form id="schedule-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          control={control}
          name="subjectId"
          render={({ field, fieldState }) => (
            <SubjectPicker
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hari" error={errors.weekday?.message}>
            <Select {...register('weekday')}>
              {weekdayOrder(prefs.weekStartsOn).map((weekday) => (
                <option key={weekday} value={weekday}>
                  {WEEKDAY_LABELS[weekday]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ruang (opsional)" error={errors.room?.message}>
            <Input {...register('room')} placeholder="Contoh: R-201 / Lab" maxLength={60} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jam mulai" error={errors.startTime?.message}>
            <Input type="time" {...register('startTime')} />
          </Field>
          <Field label="Jam selesai" error={errors.endTime?.message}>
            <Input type="time" {...register('endTime')} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export default function SchedulePage() {
  const prefs = usePreferences()
  const { parts } = useClock()
  const subjects = useSubjects()
  const slots = useLiveQuery(() => db.schedule.toArray(), [])
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDay, setSelectedDay] = useState<Weekday>(parts.weekday)
  const [modal, setModal] = useState<{ slot?: ScheduleSlot } | null>(null)
  const [deleting, setDeleting] = useState<ScheduleSlot | null>(null)

  useEffect(() => {
    if (searchParams.get('new')) {
      setModal({})
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const subjectMap = new Map((subjects ?? []).map((subject) => [subject.id, subject]))
  const dayOrder = weekdayOrder(prefs.weekStartsOn)
  const daySlots = (slots ?? [])
    .filter((slot) => slot.weekday === selectedDay)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  const totalSlots = slots?.length ?? 0
  const busiestDay = dayOrder.reduce<{ day: Weekday; count: number }>(
    (best, day) => {
      const count = (slots ?? []).filter((slot) => slot.weekday === day).length
      return count > best.count ? { day, count } : best
    },
    { day: dayOrder[0], count: 0 },
  )
  const nextClass = getNextClass(slots ?? [], parts)

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Schedule"
        description="Atur jadwal pelajaran mingguanmu. Status kelas dan hitung mundur diperbarui otomatis."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({})}>
            Tambah jadwal
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-muted">Total pelajaran / minggu</p>
          <p className="mt-1 text-2xl font-bold text-ink">{totalSlots}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-muted">Hari terpadat</p>
          <p className="mt-1 text-lg font-bold text-ink">
            {busiestDay.count > 0 ? WEEKDAY_LABELS[busiestDay.day] : '—'}
          </p>
          <p className="text-[10px] text-muted-2">{busiestDay.count} pelajaran</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="text-[10px] font-semibold text-muted">Kelas berikutnya</p>
          {nextClass ? (
            <>
              <p className="mt-1 truncate text-sm font-bold text-ink">
                {subjectMap.get(nextClass.slot.subjectId)?.name ?? 'Mata pelajaran'}
              </p>
              <p className="text-[10px] tabular-nums text-accent">
                {formatClockCountdown(nextClass.msUntil)} lagi
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-muted">Belum ada jadwal</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-border p-2 no-scrollbar">
          {dayOrder.map((day) => {
            const count = (slots ?? []).filter((slot) => slot.weekday === day).length
            const isToday = day === parts.weekday
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'relative flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-center transition',
                  selectedDay === day
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                <span className="text-[11px] font-bold">{WEEKDAY_SHORT[day]}</span>
                <span className="text-[9px] opacity-70">{count} mapel</span>
                {isToday ? (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
                ) : null}
              </button>
            )
          })}
        </div>

        <CardContent className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-1">
            <div>
              <p className="text-sm font-semibold text-ink">{WEEKDAY_LABELS[selectedDay]}</p>
              <p className="text-[10px] text-muted">
                {daySlots.length} pelajaran
                {selectedDay === parts.weekday ? ' · hari ini' : ''}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setModal({})}>
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </Button>
          </div>

          {daySlots.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title={`Belum ada jadwal hari ${WEEKDAY_LABELS[selectedDay]}`}
              description="Tambahkan pelajaran pertamamu untuk hari ini. Kamu juga bisa membuat mata pelajaran baru saat mengisi form."
              action={
                <Button size="sm" onClick={() => setModal({})} icon={<CalendarPlus className="h-3.5 w-3.5" />}>
                  Tambah jadwal
                </Button>
              }
            />
          ) : (
            daySlots.map((slot) => {
              const subject = subjectMap.get(slot.subjectId)
              const status = getSlotStatus(slot, parts)
              const isToday = selectedDay === parts.weekday
              return (
                <div
                  key={slot.id}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl border p-3 transition-all',
                    isToday && status === 'live'
                      ? 'border-success/30 bg-success-soft/30'
                      : isToday && status === 'done'
                        ? 'border-border bg-surface-2/30 opacity-60'
                        : 'border-border bg-surface hover:border-border-strong hover:shadow-soft',
                  )}
                >
                  <div className="w-14 shrink-0 text-right">
                    <p className="text-xs font-bold tabular-nums text-ink">
                      {formatTimeLabel(slot.startTime, prefs.timeFormat)}
                    </p>
                    <p className="text-[10px] tabular-nums text-muted-2">
                      {formatTimeLabel(slot.endTime, prefs.timeFormat)}
                    </p>
                  </div>
                  <span
                    className="h-10 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject?.color ?? 'var(--accent)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {subject?.name ?? 'Mata pelajaran tidak ditemukan'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {toMinutes(slot.endTime) - toMinutes(slot.startTime)} menit
                      </span>
                      {slot.room ? (
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" />
                          {slot.room}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {isToday ? (
                    status === 'live' ? (
                      <Badge variant="success" className="gap-1.5">
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-success" />
                        NOW
                      </Badge>
                    ) : status === 'done' ? (
                      <Badge variant="neutral">Selesai</Badge>
                    ) : (
                      <Badge variant="accent">Akan datang</Badge>
                    )
                  ) : null}
                  <Menu
                    items={[
                      {
                        label: 'Edit jadwal',
                        icon: Pencil,
                        onClick: () => setModal({ slot }),
                      },
                      {
                        label: 'Hapus jadwal',
                        icon: Trash2,
                        danger: true,
                        onClick: () => setDeleting(slot),
                      },
                    ]}
                  />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {modal ? (
        <ScheduleFormModal
          slot={modal.slot}
          defaultWeekday={selectedDay}
          onClose={() => setModal(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus jadwal ini?"
        description={`Jadwal ${subjectMap.get(deleting?.subjectId ?? '')?.name ?? 'pelajaran'} akan dihapus dari semua minggu. Tindakan ini tidak dapat dibatalkan.`}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return
          await deleteScheduleSlot(deleting.id)
          setDeleting(null)
          toast.success('Jadwal dihapus')
        }}
      />
    </div>
  )
}
