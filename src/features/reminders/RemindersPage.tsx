import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Clock3,
  Link2,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { db } from '@/db'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useClock } from '@/hooks/useClock'
import { usePreferences } from '@/hooks/useProfile'
import { RECURRENCE_META } from '@/lib/constants'
import { getZonedParts, pad2, zonedDateTimeToDate } from '@/lib/time'
import { cn } from '@/lib/utils'
import {
  createReminder,
  deleteReminder,
  toggleReminderCompleted,
  updateReminder,
} from '@/services/reminders'
import {
  clearReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications'
import { toast } from '@/stores/toast-store'
import type { Reminder, Recurrence } from '@/types/models'

const reminderSchema = z.object({
  title: z.string().trim().min(1, 'Judul pengingat wajib diisi.').max(120, 'Maksimal 120 karakter.'),
  description: z.string().max(1000, 'Maksimal 1000 karakter.').optional(),
  date: z.string().min(1, 'Tanggal wajib diisi.'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Jam tidak valid.'),
  assignmentId: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly']),
})

type FormValues = z.infer<typeof reminderSchema>

function splitZoned(iso: string, timeZone: string) {
  const parts = getZonedParts(new Date(iso), timeZone)
  return {
    date: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
    time: `${pad2(parts.hour)}:${pad2(parts.minute)}`,
  }
}

function formatReminderDate(iso: string, timeZone: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date)
}

function ReminderFormModal({
  reminder,
  onClose,
}: {
  reminder?: Reminder
  onClose: () => void
}) {
  const prefs = usePreferences()
  const assignments = useLiveQuery(
    () => db.assignments.filter((assignment) => assignment.status !== 'completed').toArray(),
    [],
  )
  const [saving, setSaving] = useState(false)
  const initial = reminder
    ? splitZoned(reminder.dueAt, prefs.timezone)
    : splitZoned(new Date(Date.now() + 3600 * 1000).toISOString(), prefs.timezone)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: reminder?.title ?? '',
      description: reminder?.description ?? '',
      date: initial.date,
      time: initial.time,
      assignmentId: reminder?.assignmentId ?? '',
      recurrence: reminder?.recurrence ?? 'none',
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      setSaving(true)
      const dueAt = zonedDateTimeToDate(values.date, values.time, prefs.timezone).toISOString()
      const input = {
        title: values.title,
        description: values.description ?? '',
        dueAt,
        assignmentId: values.assignmentId || undefined,
        recurrence: values.recurrence as Recurrence,
      }
      if (reminder) {
        await updateReminder(reminder.id, input)
        toast.success('Pengingat diperbarui')
      } else {
        await createReminder(input)
        toast.success('Pengingat dibuat')
      }
      onClose()
    } catch (error) {
      toast.error('Gagal menyimpan pengingat', error instanceof Error ? error.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={reminder ? 'Edit pengingat' : 'Buat pengingat'}
      description="Notifikasi muncul selama Student Hub terbuka di browser."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" form="reminder-form" loading={saving}>
            Simpan pengingat
          </Button>
        </>
      }
    >
      <form id="reminder-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Judul pengingat" error={errors.title?.message}>
          <Input {...register('title')} placeholder="Contoh: Mulai kerjakan laporan" autoFocus />
        </Field>
        <Field label="Deskripsi" error={errors.description?.message} hint="Opsional">
          <Textarea
            {...register('description')}
            placeholder="Detail singkat tentang pengingat ini…"
            rows={2}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal" error={errors.date?.message}>
            <Input type="date" {...register('date')} />
          </Field>
          <Field label="Jam" error={errors.time?.message}>
            <Input type="time" {...register('time')} />
          </Field>
        </div>
        <Field label="Hubungkan ke tugas" error={errors.assignmentId?.message} hint="Opsional">
          <Select {...register('assignmentId')}>
            <option value="">Tidak terhubung</option>
            {(assignments ?? []).map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </Select>
        </Field>
        <Controller
          control={control}
          name="recurrence"
          render={({ field }) => (
            <Field
              label="Pengulangan"
              error={errors.recurrence?.message}
              hint="Pengingat berulang akan otomatis dijadwalkan ke periode berikutnya setelah berbunyi."
            >
              <Select value={field.value} onChange={field.onChange}>
                <option value="none">Sekali saja</option>
                <option value="daily">Setiap hari</option>
                <option value="weekly">Setiap minggu</option>
              </Select>
            </Field>
          )}
        />
      </form>
    </Modal>
  )
}

export default function RemindersPage() {
  const prefs = usePreferences()
  const { now } = useClock()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'notifications' ? 'notifications' : 'reminders'
  const reminders = useLiveQuery(() => db.reminders.toArray(), [])
  const notifications = useLiveQuery(
    () => db.notifications.orderBy('createdAt').reverse().toArray(),
    [],
  )
  const assignments = useLiveQuery(() => db.assignments.toArray(), [])
  const [modal, setModal] = useState<{ reminder?: Reminder } | null>(null)
  const [deleting, setDeleting] = useState<Reminder | null>(null)

  useEffect(() => {
    if (searchParams.get('new')) {
      setModal({})
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const assignmentMap = useMemo(
    () => new Map((assignments ?? []).map((assignment) => [assignment.id, assignment])),
    [assignments],
  )
  const unread = (notifications ?? []).filter((notification) => !notification.read).length
  const upcoming = (reminders ?? [])
    .filter((reminder) => !reminder.completed)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const history = (reminders ?? [])
    .filter((reminder) => reminder.completed)
    .sort((a, b) => b.dueAt.localeCompare(a.dueAt))

  function changeTab(value: 'reminders' | 'notifications') {
    const next = new URLSearchParams(searchParams)
    if (value === 'notifications') next.set('tab', 'notifications')
    else next.delete('tab')
    setSearchParams(next, { replace: true })
  }

  async function handleDelete() {
    if (!deleting) return
    await deleteReminder(deleting.id)
    setDeleting(null)
    toast.success('Pengingat dihapus')
  }

  function ReminderRow({ reminder, past }: { reminder: Reminder; past?: boolean }) {
    const linked = reminder.assignmentId ? assignmentMap.get(reminder.assignmentId) : undefined
    const overdue = !reminder.completed && new Date(reminder.dueAt).getTime() < now.getTime()
    return (
      <div
        className={cn(
          'group flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-all hover:border-border-strong hover:shadow-soft',
          past && 'opacity-65',
        )}
      >
        <button
          type="button"
          onClick={() => {
            void toggleReminderCompleted(reminder.id).then(() =>
              toast.success(reminder.completed ? 'Pengingat diaktifkan kembali' : 'Pengingat selesai'),
            )
          }}
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition',
            reminder.completed
              ? 'border-success/30 bg-success-soft text-success'
              : 'border-border bg-surface-2 text-muted hover:border-success hover:text-success',
          )}
          aria-label={reminder.completed ? 'Aktifkan kembali' : 'Tandai selesai'}
        >
          <Check className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={cn('text-sm font-semibold text-ink', reminder.completed && 'line-through')}>
              {reminder.title}
            </p>
            {reminder.recurrence !== 'none' ? (
              <Badge variant="accent" className="gap-1">
                <Repeat className="h-3 w-3" />
                {RECURRENCE_META[reminder.recurrence].label}
              </Badge>
            ) : null}
            {overdue ? <Badge variant="danger">Sudah lewat</Badge> : null}
            {reminder.completed ? <Badge variant="success">Selesai</Badge> : null}
          </div>
          {reminder.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
              {reminder.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {formatReminderDate(reminder.dueAt, prefs.timezone)}
            </span>
            {linked ? (
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <Link2 className="h-3 w-3 shrink-0" />
                {linked.title}
              </span>
            ) : null}
          </div>
        </div>
        <Menu
          items={[
            { label: 'Edit pengingat', icon: Pencil, onClick: () => setModal({ reminder }) },
            {
              label: reminder.completed ? 'Aktifkan kembali' : 'Tandai selesai',
              icon: Check,
              onClick: () => void toggleReminderCompleted(reminder.id),
            },
            {
              label: 'Hapus pengingat',
              icon: Trash2,
              danger: true,
              onClick: () => setDeleting(reminder),
            },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Reminders"
        description="Pengingat fleksibel untuk tugas dan aktivitas sekolah, lengkap dengan riwayat notifikasi."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModal({})}>
            Buat pengingat
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<'reminders' | 'notifications'>
          ariaLabel="Bagian pengingat"
          value={tab}
          onChange={changeTab}
          options={[
            {
              value: 'reminders',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  Pengingat
                </span>
              ),
            },
            {
              value: 'notifications',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <BellRing className="h-3.5 w-3.5" />
                  Notifikasi
                  {unread > 0 ? (
                    <span className="rounded-full bg-accent px-1.5 text-[9px] font-bold text-[var(--accent-ink)]">
                      {unread}
                    </span>
                  ) : null}
                </span>
              ),
            },
          ]}
        />
        <p className="text-[10px] text-muted-2">
          Pengingat berjalan saat Student Hub terbuka. Tidak ada push notification di latar belakang.
        </p>
      </div>

      {tab === 'reminders' ? (
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Akan datang</h2>
                <p className="text-[10px] text-muted">{upcoming.length} pengingat aktif</p>
              </div>
              <Bell className="h-4 w-4 text-muted" />
            </div>
            <div className="mt-3 space-y-2">
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={BellOff}
                  title="Belum ada pengingat aktif"
                  description="Buat pengingat untuk deadline tugas, jadwal belajar, atau kegiatan sekolah."
                  compact
                  action={
                    <Button size="sm" onClick={() => setModal({})}>
                      Buat pengingat
                    </Button>
                  }
                />
              ) : (
                upcoming.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} />)
              )}
            </div>
          </Card>

          {history.length > 0 ? (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Riwayat</h2>
                  <p className="text-[10px] text-muted">{history.length} pengingat selesai</p>
                </div>
                <CheckCheck className="h-4 w-4 text-muted" />
              </div>
              <div className="mt-3 space-y-2">
                {history.map((reminder) => (
                  <ReminderRow key={reminder.id} reminder={reminder} past />
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Notification center</h2>
              <p className="text-[10px] text-muted">
                {unread > 0 ? `${unread} belum dibaca` : 'Semua notifikasi sudah dibaca'}
              </p>
            </div>
            <div className="flex gap-2">
              {unread > 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<CheckCheck className="h-3.5 w-3.5" />}
                  onClick={() => void markAllNotificationsRead()}
                >
                  Tandai dibaca
                </Button>
              ) : null}
              {(notifications ?? []).some((notification) => notification.read) ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => void clearReadNotifications()}
                >
                  Bersihkan
                </Button>
              ) : null}
            </div>
          </div>
          <div className="p-2 sm:p-3">
            {notifications === undefined ? (
              <p className="py-10 text-center text-xs text-muted">Memuat notifikasi…</p>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={BellOff}
                title="Belum ada notifikasi"
                description="Saat pengingat berbunyi atau deadline mendekat, riwayatnya muncul di sini."
              />
            ) : (
              <div className="space-y-1.5">
                {notifications.map((notification) => {
                  const Icon =
                    notification.kind === 'deadline'
                      ? Clock3
                      : notification.kind === 'reminder'
                        ? Bell
                        : BellRing
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={async () => {
                        await markNotificationRead(notification.id)
                        if (notification.kind === 'deadline' || notification.assignmentId) {
                          navigate('/assignments')
                        }
                      }}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-surface-2',
                        !notification.read && 'bg-accent-soft/40',
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-ink">
                            {notification.title}
                          </span>
                          {!notification.read ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                          {notification.body}
                        </span>
                        <span className="mt-1 block text-[9px] text-muted-2">
                          {formatReminderDate(notification.createdAt, prefs.timezone)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {modal ? <ReminderFormModal reminder={modal.reminder} onClose={() => setModal(null)} /> : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus pengingat ini?"
        description={`"${deleting?.title ?? ''}" akan dihapus permanen dari daftar pengingat.`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
