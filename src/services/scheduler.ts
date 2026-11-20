import { db } from '@/db'
import type { AppNotification } from '@/types/models'
import { zonedDateTimeToDate } from '@/lib/time'
import { advanceRecurringReminder } from '@/services/reminders'
import { createNotification } from '@/services/notifications'

function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag: `student-hub-${title}` })
  } catch {
    /* browser may block notifications created outside a service worker */
  }
}

export async function runNotificationCheck(): Promise<AppNotification[]> {
  const profile = await db.profile.get('me')
  if (!profile) return []
  const now = new Date()
  const created: AppNotification[] = []

  if (profile.prefs.notificationsEnabled) {
    const dueReminders = await db.reminders
      .where('dueAt')
      .belowOrEqual(now.toISOString())
      .toArray()
    for (const reminder of dueReminders) {
      if (reminder.completed) continue
      const due = new Date(reminder.dueAt)
      if (Number.isNaN(due.getTime()) || due > now) continue
      if (reminder.notifiedAt && new Date(reminder.notifiedAt) >= due) continue

      const linked = reminder.assignmentId
        ? await db.assignments.get(reminder.assignmentId)
        : undefined
      const body = [reminder.description, linked ? `Tugas: ${linked.title}` : '']
        .filter(Boolean)
        .join(' · ')

      const notification = await createNotification({
        title: reminder.title,
        body: body || 'Waktu pengingat sudah tiba.',
        kind: 'reminder',
        reminderId: reminder.id,
      })
      created.push(notification)

      if (reminder.recurrence === 'none') {
        await db.reminders.update(reminder.id, {
          notifiedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })
      } else {
        await advanceRecurringReminder(reminder, now)
      }
    }
  }

  if (profile.prefs.deadlineAlerts) {
    const activeAssignments = await db.assignments
      .filter((assignment) => assignment.status !== 'completed')
      .toArray()
    for (const assignment of activeAssignments) {
      if (assignment.deadlineNotifiedAt) continue
      const due = zonedDateTimeToDate(
        assignment.dueDate,
        assignment.dueTime,
        profile.prefs.timezone,
      )
      if (Number.isNaN(due.getTime())) continue
      const diff = due.getTime() - now.getTime()
      if (diff > 24 * 3600 * 1000) continue
      if (diff > -3 * 86400 * 1000) {
        const notification = await createNotification({
          title: 'Deadline mendekat',
          body: `${assignment.title} · jatuh tempo ${new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: profile.prefs.timezone,
          }).format(due)}`,
          kind: 'deadline',
          assignmentId: assignment.id,
        })
        created.push(notification)
      }
      await db.assignments.update(assignment.id, {
        deadlineNotifiedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
    }
  }

  if (profile.prefs.browserNotifications) {
    for (const notification of created) {
      showBrowserNotification(notification.title, notification.body)
    }
  }

  return created
}
