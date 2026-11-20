import {
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Presentation,
} from 'lucide-react'
import { FILE_KIND_META, getFileKind } from '@/lib/files'
import { cn } from '@/lib/utils'

export function FileTypeIcon({
  ext,
  size = 40,
  className,
}: {
  ext: string
  size?: number
  className?: string
}) {
  const kind = getFileKind(ext)
  const meta = FILE_KIND_META[kind]
  const Icon =
    kind === 'pdf' || kind === 'text'
      ? FileText
      : kind === 'word'
        ? FileText
        : kind === 'excel'
          ? FileSpreadsheet
          : kind === 'powerpoint'
            ? Presentation
            : kind === 'image'
              ? ImageIcon
              : kind === 'zip'
                ? FileArchive
                : File
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-xl', className)}
      style={{ width: size, height: size, backgroundColor: meta.soft, color: meta.color }}
      aria-hidden="true"
    >
      <Icon style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  )
}
