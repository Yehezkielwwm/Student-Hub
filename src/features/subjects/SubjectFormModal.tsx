import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { SUBJECT_COLORS } from '@/lib/constants'
import { createSubject, updateSubject } from '@/services/subjects'
import { toast } from '@/stores/toast-store'
import type { Subject } from '@/types/models'

const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Nama mata pelajaran wajib diisi.').max(60, 'Maksimal 60 karakter.'),
  description: z.string().max(400, 'Maksimal 400 karakter.').optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Warna tidak valid.'),
})

type FormValues = z.infer<typeof subjectSchema>

export function SubjectFormModal({
  subject,
  onClose,
}: {
  subject?: Subject
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: subject?.name ?? '',
      description: subject?.description ?? '',
      color: subject?.color ?? SUBJECT_COLORS[0],
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      setSaving(true)
      if (subject) {
        await updateSubject(subject.id, values)
        toast.success('Mata pelajaran diperbarui')
      } else {
        await createSubject(values)
        toast.success('Mata pelajaran ditambahkan')
      }
      onClose()
    } catch (error) {
      toast.error('Gagal menyimpan mata pelajaran', error instanceof Error ? error.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={subject ? 'Edit mata pelajaran' : 'Tambah mata pelajaran'}
      description="Warna mata pelajaran dipakai pada jadwal, tugas, dan grafik."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" form="subject-form" loading={saving}>
            Simpan
          </Button>
        </>
      }
    >
      <form id="subject-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nama mata pelajaran" error={errors.name?.message}>
          <Input {...register('name')} placeholder="Contoh: Matematika" autoFocus maxLength={60} />
        </Field>
        <Field label="Deskripsi" error={errors.description?.message} hint="Opsional">
          <Textarea
            {...register('description')}
            placeholder="Topik atau catatan singkat tentang mata pelajaran ini…"
            rows={3}
            maxLength={400}
          />
        </Field>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <Field label="Warna" error={errors.color?.message}>
              <ColorPicker value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />
      </form>
    </Modal>
  )
}
