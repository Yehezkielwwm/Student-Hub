import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { deviceTimeZone, getZonedParts, type ZonedParts } from '@/lib/time'

interface ClockContextValue {
  now: Date
  parts: ZonedParts
  timeZone: string
}

const ClockContext = createContext<ClockContextValue | null>(null)

export function ClockProvider({ children }: { children: ReactNode }) {
  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const timeZone = profile?.prefs.timezone || deviceTimeZone()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const parts = useMemo(() => getZonedParts(now, timeZone), [now, timeZone])

  return (
    <ClockContext.Provider value={{ now, parts, timeZone }}>{children}</ClockContext.Provider>
  )
}

export function useClock() {
  const context = useContext(ClockContext)
  if (!context) throw new Error('useClock harus dipakai di dalam ClockProvider.')
  return context
}
