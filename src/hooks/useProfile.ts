import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { deviceTimeZone } from '@/lib/time'
import type { Preferences } from '@/types/models'

export const FALLBACK_PREFERENCES: Preferences = {
  theme: 'system',
  timeFormat: '24h',
  weekStartsOn: 1,
  timezone: deviceTimeZone(),
  notificationsEnabled: true,
  browserNotifications: false,
  deadlineAlerts: true,
}

export function useProfile() {
  return useLiveQuery(() => db.profile.get('me'), [])
}

export function usePreferences() {
  const profile = useProfile()
  return profile?.prefs ?? FALLBACK_PREFERENCES
}

export function useSubjects() {
  return useLiveQuery(() => db.subjects.orderBy('name').toArray(), [])
}

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('name').toArray(), [])
}
