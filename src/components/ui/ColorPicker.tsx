import { Check } from 'lucide-react'
import { SUBJECT_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function ColorPicker({
  value,
  onChange,
  colors = SUBJECT_COLORS,
}: {
  value: string
  onChange: (color: string) => void
  colors?: string[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            aria-label={`Pilih warna ${color}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110',
              selected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
            )}
            style={{ backgroundColor: color }}
          >
            {selected ? <Check className="h-3.5 w-3.5 text-white" /> : null}
          </button>
        )
      })}
      <label
        className="relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border-strong text-[10px] font-bold text-muted hover:border-accent hover:text-accent"
        title="Warna khusus"
      >
        +
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Warna khusus"
        />
      </label>
    </div>
  )
}
