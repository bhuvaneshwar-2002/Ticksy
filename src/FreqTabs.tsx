import { type Frequency, FREQUENCIES, FREQ_LABEL } from './periods'

export const freqColor = (f: Frequency) => `var(--freq-${f})`

export default function FreqTabs({
  value,
  onChange,
  counts,
}: {
  value: Frequency
  onChange: (f: Frequency) => void
  counts?: Partial<Record<Frequency, string>>
}) {
  return (
    <div className="seg" role="group" aria-label="Frequency">
      {FREQUENCIES.map((f) => (
        <button key={f} type="button" aria-pressed={value === f} onClick={() => onChange(f)}>
          <span className="dot" style={{ background: freqColor(f) }} />
          {FREQ_LABEL[f]}
          {counts?.[f] && <span className="tag">{counts[f]}</span>}
        </button>
      ))}
    </div>
  )
}
