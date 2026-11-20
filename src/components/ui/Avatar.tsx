import { useAssetUrl } from '@/hooks/useFiles'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({
  name,
  assetId,
  size = 36,
  className,
}: {
  name: string
  assetId?: string
  size?: number
  className?: string
}) {
  const url = useAssetUrl(assetId)
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-bold text-accent ring-1 ring-border',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
    >
      {url ? (
        <img src={url} alt={`Foto profil ${name}`} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  )
}
