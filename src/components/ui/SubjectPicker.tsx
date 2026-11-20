import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field, Input, Select } from '@/components/ui/Field'
import { useSubjects } from '@/hooks/useProfile'
import { createSubject } from '@/services/subjects'
import { SUBJECT_COLORS } from '@/lib/constants'
import { toast } from '@/stores/toast-store'

export function SubjectPicker({
  value,
  onChange,
  error,
  hint,
  label = 'Mata pelajaran',
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  label?: string
}) {
  const subjects = useSubjects()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUBJECT_COLORS[0])
  const [busy, setBusy] = useState(false)
  const known = subjects?.some((subject) => subject.id === value)

  async function handleCreate() {
    try {
      setBusy(true)
      const id = await createSubject({ name, color })
      onChange(id)
      setName('')
      setCreating(false)
      toast.success('Mata pelajaran ditambahkan')
    } catch (err) {
      toast.error('Gagal menambah mata pelajaran', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field
      label={label}
      error={error}
      hint={
        hint ??
        (!subjects?.length ? 'Belum ada mata pelajaran. Buat satu langsung di sini.' : undefined)
      }
    >
      <div className="flex gap-2">
        <Select
          value={value}
          onChange={(event) => {
            if (event.target.value === '__new') {
              setCreating(true)
            } else {
              onChange(event.target.value)
            }
          }}
        >
          <option value="">Pilih mata pelajaran</option>
          {subjects?.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
          {value && !known ? <option value={value}>Mata pelajaran tidak ditemukan</option> : null}
          <option value="__new">+ Mata pelajaran baru</option>
        </Select>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setCreating((open) => !open)}
          aria-label="Tambah mata pelajaran"
          title="Tambah mata pelajaran"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {creating ? (
        <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface-2/60 p-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nama mata pelajaran baru"
            aria-label="Nama mata pelajaran baru"
            autoFocus
          />
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleCreate} loading={busy} disabled={!name.trim()}>
              Simpan mapel
            </Button>
          </div>
        </div>
      ) : null}
    </Field>
  )
}
