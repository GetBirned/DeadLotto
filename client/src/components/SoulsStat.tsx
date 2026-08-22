// Mimics Deadlock's in-game souls/item-value readout: a soul glyph, a bold mint
// number with thousands separators, and an optional small caps label.
export function SoulsStat({ souls, label, size = 'md' }: { souls: number; label?: string; size?: 'sm' | 'md' }) {
  const numberClass = size === 'sm' ? 'text-sm' : 'text-base'
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className={`${iconClass} shrink-0 fill-dl-mint`}>
        <path d="M14.2 1.2c.6 1.7-.2 3-1.4 4-1.6 1.4-3 2.7-1.8 4.8 1-.3 1.7-1.1 2.1-2.1.9 1.8.4 3.6-.9 4.9-1.7 1.7-1.9 3.5-.6 5.5a5.7 5.7 0 0 0 4.6-8.9c1.6.2 2.7 1.2 3.4 2.6.9-4.4-1.9-8.6-5.4-10.8Zm-4.9 5.3C6.2 8.1 3.8 11 4 14.6a5.9 5.9 0 0 0 8.8 5c-2.1-1.1-2.8-2.8-2.2-5 .5.7 1.2 1.1 2.1 1.2-.6-2.4-2.8-2.9-2.7-5a5.6 5.6 0 0 1 .3-3.3Z" />
      </svg>
      <span className={`font-display font-bold text-dl-mint ${numberClass}`}>{souls.toLocaleString()}</span>
      {label && <span className="text-xs font-display tracking-wide text-dl-mint/70">{label}</span>}
    </span>
  )
}
