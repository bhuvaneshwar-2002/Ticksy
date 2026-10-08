import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db, toggleCompletion } from '../db'
import FreqTabs, { freqColor } from '../FreqTabs'
import { type Frequency, FREQUENCIES, periodKey, periodLabel, periodStart, shiftPeriod } from '../periods'
import { activeIn, buildDoneSet, doneKey } from '../stats'
import { usePersisted } from '../usePersisted'

export default function Checklist() {
  const [freq, setFreq] = usePersisted<Frequency>('checklist.freq', 'daily')
  const [offset, setOffset] = useState(0)

  const items = useLiveQuery(() => db.items.orderBy('order').toArray(), [])
  const now = new Date()
  const current = periodStart(freq, shiftPeriod(freq, periodStart(freq, now), offset))
  const keys = FREQUENCIES.map((f) => periodKey(f, f === freq ? current : now))
  const completions = useLiveQuery(() => db.completions.where('periodKey').anyOf(keys).toArray(), [keys.join()])

  if (!items || !completions) return null

  const done = buildDoneSet(completions)
  const key = periodKey(freq, current)
  const visible = items.filter((i) => activeIn(i, freq, current))
  const doneCount = visible.filter((i) => done.has(doneKey(i.id, key))).length

  // Badges show progress for the *current* period of each frequency.
  const counts: Partial<Record<Frequency, string>> = {}
  for (const f of FREQUENCIES) {
    const k = periodKey(f, now)
    const list = items.filter((i) => activeIn(i, f, now))
    if (list.length) counts[f] = `${list.filter((i) => done.has(doneKey(i.id, k))).length}/${list.length}`
  }

  const changeFreq = (f: Frequency) => {
    setFreq(f)
    setOffset(0)
  }

  return (
    <section className="card">
      <FreqTabs value={freq} onChange={changeFreq} counts={counts} />

      <div className="period-nav">
        <button className="btn icon" onClick={() => setOffset(offset - 1)} aria-label="Previous period">
          ‹
        </button>
        <div className="label">
          {periodLabel(freq, current)}
          {offset === 0 && <div className="note">Current</div>}
        </div>
        <button className="btn icon" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Next period">
          ›
        </button>
      </div>

      {visible.length > 0 && (
        <>
          <div className="row spread note" style={{ marginBottom: 6 }}>
            <span>
              {doneCount} of {visible.length} done
            </span>
            <span>{Math.round((doneCount / visible.length) * 100)}%</span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={visible.length}
          >
            <div style={{ width: `${(doneCount / visible.length) * 100}%`, background: freqColor(freq) }} />
          </div>
        </>
      )}

      {visible.length === 0 ? (
        <div className="empty">
          No {freq} items{offset < 0 ? ' for this period' : ' yet'}. <Link to="/settings">Add some in Settings</Link>.
        </div>
      ) : (
        <ul className="checklist">
          {visible.map((item) => {
            const isDone = done.has(doneKey(item.id, key))
            return (
              <li key={item.id}>
                <label className={`check${isDone ? ' done' : ''}`}>
                  <input type="checkbox" checked={isDone} onChange={() => toggleCompletion(item.id, key)} />
                  <span>{item.title}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
