import { useEffect } from 'react'
import { toast } from '@/stores/toast-store'
import { runNotificationCheck } from '@/services/scheduler'

export function ReminderScheduler() {
  useEffect(() => {
    let active = true

    async function check() {
      try {
        const created = await runNotificationCheck()
        if (!active || created.length === 0) return
        const first = created[0]
        toast.info(
          first.title,
          created.length > 1 ? `${created.length} notifikasi baru masuk.` : first.body,
        )
      } catch (error) {
        console.error('Gagal memeriksa pengingat', error)
      }
    }

    const initial = window.setTimeout(check, 1200)
    const timer = window.setInterval(check, 15000)
    return () => {
      active = false
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [])

  return null
}
