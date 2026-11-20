import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bell,
  CalendarDays,
  Clock3,
  Database,
  Download,
  Globe2,
  HardDrive,
  Info,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  Upload,
  User,
} from 'lucide-react'
import { db, clearAllData } from '@/db'
import { loadSampleData } from '@/db/seed'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { Progress } from '@/components/ui/Progress'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Toggle } from '@/components/ui/Toggle'
import { useTheme } from '@/app/ThemeProvider'
import { useNotificationPermission } from '@/hooks/useFiles'
import { usePreferences, useProfile } from '@/hooks/useProfile'
import { formatBytes } from '@/lib/files'
import { TIMEZONE_OPTIONS, deviceTimeZone } from '@/lib/time'
import { percent } from '@/lib/utils'
import {
  downloadJson,
  exportAllData,
  importAllData,
} from '@/services/backup'
import { removeAvatar, setAvatar, updatePreferences, updateProfile } from '@/services/profile'
import { toast } from '@/stores/toast-store'
import type { ThemeMode, TimeFormat, WeekStartsOn } from '@/types/models'

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const profile = useProfile()
  const prefs = usePreferences()
  const { setMode } = useTheme()
  const { permission, requestPermission } = useNotificationPermission()
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<'sample' | 'reset' | null>(null)
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const counts = useLiveQuery(async () => {
    const [subjects, assignments, files, reminders] = await Promise.all([
      db.subjects.count(),
      db.assignments.count(),
      db.files.count(),
      db.reminders.count(),
    ])
    return { subjects, assignments, files, reminders }
  }, [])

  useEffect(() => {
    if (profile?.name && !name) setName(profile.name)
  }, [profile?.name, name])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return
    let active = true
    void navigator.storage.estimate().then((estimate) => {
      if (active) setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 })
    })
    return () => {
      active = false
    }
  }, [counts?.files])

  const timezoneOptions = TIMEZONE_OPTIONS.includes(prefs.timezone)
    ? TIMEZONE_OPTIONS
    : [prefs.timezone, ...TIMEZONE_OPTIONS]
  const deviceZone = deviceTimeZone()

  async function handleSaveName() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Nama tidak boleh kosong')
      return
    }
    try {
      setSavingName(true)
      await updateProfile({ name: trimmed })
      toast.success('Nama diperbarui')
    } catch (error) {
      toast.error('Gagal menyimpan nama', error instanceof Error ? error.message : undefined)
    } finally {
      setSavingName(false)
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return
    try {
      await setAvatar(file)
      toast.success('Foto profil diperbarui')
    } catch (error) {
      toast.error('Gagal mengunggah foto', error instanceof Error ? error.message : undefined)
    }
  }

  async function handleBrowserNotifications(enabled: boolean) {
    if (enabled) {
      if (permission === 'unsupported') {
        toast.error('Browser ini tidak mendukung notifikasi')
        return
      }
      const result = permission === 'granted' ? 'granted' : await requestPermission()
      if (result !== 'granted') {
        toast.warning('Izin notifikasi tidak diberikan', 'Aktifkan lewat pengaturan browser jika berubah pikiran.')
        return
      }
    }
    await updatePreferences({ browserNotifications: enabled })
    toast.success(enabled ? 'Notifikasi browser diaktifkan' : 'Notifikasi browser dimatikan')
  }

  async function handleExport() {
    try {
      setExporting(true)
      const { json, fileName } = await exportAllData()
      downloadJson(json, fileName)
      toast.success('Backup diunduh', 'Simpan file JSON di tempat yang aman.')
    } catch (error) {
      toast.error('Gagal membuat backup', error instanceof Error ? error.message : undefined)
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      setPendingImport(text)
    } catch {
      toast.error('Gagal membaca file backup')
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return
    try {
      setImporting(true)
      await importAllData(pendingImport)
      toast.success('Data berhasil dipulihkan')
      setPendingImport(null)
      window.setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      toast.error('Gagal memulihkan data', error instanceof Error ? error.message : undefined)
      setImporting(false)
    }
  }

  const usagePercent = storage ? percent(storage.usage, storage.quota) : 0

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Settings"
        description="Atur profil, tampilan, waktu, notifikasi, dan cadangan data lokalmu."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Profil"
              description="Nama dan foto ini tampil di sidebar dan dashboard."
              action={<User className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-5 pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={profile?.name ?? 'Siswa'} assetId={profile?.avatarAssetId} size={72} />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-ink transition hover:bg-surface-2">
                    <Upload className="h-3.5 w-3.5" />
                    Ganti foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        void handleAvatar(event.target.files?.[0])
                        event.target.value = ''
                      }}
                    />
                  </label>
                  {profile?.avatarAssetId ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void removeAvatar().then(() => toast.success('Foto profil dihapus'))
                      }}
                    >
                      Hapus foto
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Nama pengguna" className="flex-1">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nama kamu"
                    maxLength={60}
                  />
                </Field>
                <Button
                  onClick={handleSaveName}
                  loading={savingName}
                  disabled={!name.trim() || name.trim() === profile?.name}
                  icon={<Save className="h-4 w-4" />}
                >
                  Simpan
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Tampilan"
              description="Tema terang, gelap, atau mengikuti sistem."
              action={<Palette className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-4 pt-4">
              <SegmentedControl<ThemeMode>
                ariaLabel="Tema aplikasi"
                value={prefs.theme}
                onChange={(value) => {
                  void setMode(value)
                }}
                className="w-full sm:w-auto"
                options={[
                  {
                    value: 'light',
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <Sun className="h-3.5 w-3.5" /> Terang
                      </span>
                    ),
                  },
                  {
                    value: 'dark',
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5" /> Gelap
                      </span>
                    ),
                  },
                  {
                    value: 'system',
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5" /> Sistem
                      </span>
                    ),
                  },
                ]}
              />
              <p className="text-[10px] leading-relaxed text-muted-2">
                Preferensi tema disimpan di perangkat ini dan diterapkan sebelum halaman dirender
                untuk menghindari kilatan warna.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Waktu & format"
              description="Format jam, awal minggu, dan zona waktu tampilan."
              action={<Clock3 className="h-4 w-4 text-muted" />}
            />
            <CardContent className="divide-y divide-border pt-1">
              <SettingRow title="Format waktu" description="Tampilan jam di seluruh aplikasi.">
                <SegmentedControl<TimeFormat>
                  value={prefs.timeFormat}
                  onChange={(value) => void updatePreferences({ timeFormat: value })}
                  options={[
                    { value: '24h', label: '24 jam' },
                    { value: '12h', label: '12 jam' },
                  ]}
                />
              </SettingRow>
              <SettingRow title="Awal minggu" description="Dipakai untuk kalender dan analitik mingguan.">
                <SegmentedControl<string>
                  value={String(prefs.weekStartsOn)}
                  onChange={(value) =>
                    void updatePreferences({ weekStartsOn: Number(value) as WeekStartsOn })
                  }
                  options={[
                    { value: '1', label: 'Senin' },
                    { value: '0', label: 'Minggu' },
                  ]}
                />
              </SettingRow>
              <SettingRow
                title="Zona waktu"
                description={`Perangkat ini terdeteksi ${deviceZone}. Jadwal dan deadline dihitung memakai zona waktu ini.`}
              >
                <div className="w-[210px] max-w-[46vw]">
                  <Select
                    value={prefs.timezone}
                    onChange={(event) => void updatePreferences({ timezone: event.target.value })}
                  >
                    {timezoneOptions.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replace('_', ' ')}
                      </option>
                    ))}
                  </Select>
                </div>
              </SettingRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Notifikasi"
              description="Kendali notifikasi dalam aplikasi dan browser."
              action={<Bell className="h-4 w-4 text-muted" />}
            />
            <CardContent className="divide-y divide-border pt-1">
              <SettingRow
                title="Pengingat dalam aplikasi"
                description="Tampilkan toast dan isi notification center saat pengingat tiba."
              >
                <Toggle
                  label="Pengingat dalam aplikasi"
                  checked={prefs.notificationsEnabled}
                  onChange={(checked) => void updatePreferences({ notificationsEnabled: checked })}
                />
              </SettingRow>
              <SettingRow
                title="Peringatan deadline"
                description="Notifikasi saat deadline tugas kurang dari 24 jam."
              >
                <Toggle
                  label="Peringatan deadline"
                  checked={prefs.deadlineAlerts}
                  onChange={(checked) => void updatePreferences({ deadlineAlerts: checked })}
                />
              </SettingRow>
              <SettingRow
                title="Notifikasi browser"
                description={
                  permission === 'granted'
                    ? 'Izin diberikan. Notifikasi muncul selama tab Student Hub terbuka.'
                    : permission === 'denied'
                      ? 'Izin ditolak di browser. Aktifkan lewat pengaturan situs.'
                      : permission === 'unsupported'
                        ? 'Browser ini tidak mendukung Notification API.'
                        : 'Minta izin untuk menampilkan notifikasi desktop.'
                }
              >
                <div className="flex items-center gap-2">
                  {permission === 'default' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void requestPermission()}
                    >
                      Izinkan
                    </Button>
                  ) : null}
                  <Toggle
                    label="Notifikasi browser"
                    checked={prefs.browserNotifications && permission === 'granted'}
                    onChange={(checked) => void handleBrowserNotifications(checked)}
                    disabled={permission === 'unsupported' || permission === 'denied'}
                  />
                </div>
              </SettingRow>
              <div className="flex items-start gap-2 py-3">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2" />
                <p className="text-[10px] leading-relaxed text-muted-2">
                  Student Hub tidak memiliki backend atau push service. Pengingat hanya diperiksa
                  saat aplikasi terbuka; tidak ada notifikasi yang berjalan setelah tab ditutup.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Penyimpanan lokal"
              description="Semua data disimpan di IndexedDB perangkat."
              action={<HardDrive className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-ink">{storage ? formatBytes(storage.usage) : '—'}</p>
                <p className="text-[10px] text-muted">
                  {storage ? `dari ${formatBytes(storage.quota)}` : 'menghitung…'}
                </p>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface-2/60 px-2.5 py-2">
                  <p className="text-[9px] text-muted">Mapel</p>
                  <p className="text-sm font-bold text-ink">{counts?.subjects ?? 0}</p>
                </div>
                <div className="rounded-xl bg-surface-2/60 px-2.5 py-2">
                  <p className="text-[9px] text-muted">Tugas</p>
                  <p className="text-sm font-bold text-ink">{counts?.assignments ?? 0}</p>
                </div>
                <div className="rounded-xl bg-surface-2/60 px-2.5 py-2">
                  <p className="text-[9px] text-muted">File</p>
                  <p className="text-sm font-bold text-ink">{counts?.files ?? 0}</p>
                </div>
                <div className="rounded-xl bg-surface-2/60 px-2.5 py-2">
                  <p className="text-[9px] text-muted">Pengingat</p>
                  <p className="text-sm font-bold text-ink">{counts?.reminders ?? 0}</p>
                </div>
              </div>
              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-2">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                Data tidak dikirim ke server mana pun. Menghapus data browser akan menghapus data
                Student Hub juga.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Data & cadangan"
              description="Ekspor, pulihkan, atau isi dengan data contoh."
              action={<Database className="h-4 w-4 text-muted" />}
            />
            <CardContent className="space-y-2.5 pt-4">
              <Button
                variant="secondary"
                className="w-full justify-start"
                icon={<Download className="h-4 w-4" />}
                onClick={handleExport}
                loading={exporting}
              >
                Export backup (JSON)
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                icon={<Upload className="h-4 w-4" />}
                onClick={() => importRef.current?.click()}
                loading={importing}
              >
                Import backup
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  void handleImportFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <Button
                variant="secondary"
                className="w-full justify-start"
                icon={<Sparkles className="h-4 w-4" />}
                onClick={() => setConfirmAction('sample')}
              >
                Muat data contoh
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-danger hover:bg-danger-soft hover:text-danger"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmAction('reset')}
              >
                Hapus semua data
              </Button>
              <p className="text-[10px] leading-relaxed text-muted-2">
                Backup menyertakan isi file dan foto profil, sehingga ukurannya bisa besar. Import
                akan mengganti seluruh data yang ada saat ini.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Tentang" description="Student Hub v1.0.0" action={<Info className="h-4 w-4 text-muted" />} />
            <CardContent className="space-y-2 pt-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="accent">Local-first</Badge>
                <Badge variant="neutral">IndexedDB</Badge>
                <Badge variant="neutral">Tanpa akun</Badge>
              </div>
              <p className="text-[10px] leading-relaxed text-muted">
                Dashboard produktivitas siswa dengan jadwal real-time, manajemen tugas, pengingat,
                file manager, dan analitik. Arsitektur data dipisahkan lewat service layer agar siap
                ditambahkan backend dan autentikasi di masa depan.
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-2">
                <Globe2 className="h-3 w-3" />
                Zona waktu aktif: {prefs.timezone.replace('_', ' ')}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-2">
                <Timer className="h-3 w-3" />
                Jam diperbarui setiap detik dari perangkat.
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-2">
                <CalendarDays className="h-3 w-3" />
                Jadwal berulang setiap minggu.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === 'sample'}
        title="Muat data contoh?"
        description="Data contoh (mapel, jadwal, tugas, pengingat, folder) akan ditambahkan. Data yang sudah ada tidak dihapus, tetapi tugas dan mapel contoh bisa tampil bersamaan."
        confirmLabel="Muat data"
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const result = await loadSampleData()
          setConfirmAction(null)
          toast.success('Data contoh dimuat', `${result.subjects} mapel dan ${result.assignments} tugas ditambahkan.`)
        }}
      />

      <ConfirmDialog
        open={confirmAction === 'reset'}
        title="Hapus semua data?"
        description="Seluruh tugas, jadwal, file, pengingat, dan pengaturan akan dihapus permanen dari perangkat ini. Pastikan kamu sudah membuat backup."
        confirmLabel="Hapus permanen"
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          await clearAllData()
          window.location.reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Pulihkan backup ini?"
        description="Seluruh data saat ini akan diganti dengan isi file backup. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Pulihkan data"
        onCancel={() => setPendingImport(null)}
        onConfirm={handleConfirmImport}
      />
    </div>
  )
}
