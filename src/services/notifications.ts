import { db } from '@/db'
import type { AppNotification, NotificationKind } from '@/types/models'
import { nowISO, uid } from '@/lib/utils'

export async function createNotification(input: {
  title: string
  body: string
  kind: NotificationKind
  reminderId?: string
  assignmentId?: string
}): Promise<AppNotification> {
  const notification: AppNotification = {
    id: uid(),
    title: input.title,
    body: input.body,
    kind: input.kind,
    read: false,
    reminderId: input.reminderId,
    assignmentId: input.assignmentId,
    createdAt: nowISO(),
  }
  await db.notifications.add(notification)
  return notification
}

export async function markNotificationRead(id: string) {
  await db.notifications.update(id, { read: true })
}

export async function markAllNotificationsRead() {
  await db.notifications.toCollection().modify({ read: true })
}

export async function deleteNotification(id: string) {
  await db.notifications.delete(id)
}

export async function clearReadNotifications() {
  await db.notifications.where('read').equals(1).delete()
}
