import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const nextUrl = URL.createObjectURL(blob)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [blob])

  return url
}

export function useAssetUrl(assetId: string | undefined) {
  const asset = useLiveQuery(
    async () => (assetId ? await db.assets.get(assetId) : undefined),
    [assetId],
  )
  return useObjectUrl(asset?.blob)
}

export function useFileBlob(fileId: string | undefined) {
  return useLiveQuery(
    async () => (fileId ? await db.fileBlobs.get(fileId) : undefined),
    [fileId],
  )
}

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  })

  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported' as const
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  return { permission, requestPermission }
}
