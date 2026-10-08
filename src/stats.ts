import type { Completion, Item } from './db'
import {
  type Frequency,
  FREQUENCIES,
  dayKey,
  periodEnd,
  periodKey,
  periodsBetween,
  periodStart,
  parseDay,
  shiftPeriod,
} from './periods'

export type DoneSet = Set<string>

/** Lookup key for "item X done in period P". */
export const doneKey = (itemId: number, pKey: string) => `${itemId}|${pKey}`

export function buildDoneSet(completions: Completion[]): DoneSet {
  return new Set(completions.map((c) => doneKey(c.itemId, c.periodKey)))
}

/** An item counts for a period once it existed on or before that period's last day. */
export function activeIn(item: Item, freq: Frequency, d: Date): boolean {
  return !item.archived && item.frequency === freq && item.createdOn <= dayKey(periodEnd(freq, d))
}

export interface PeriodPoint {
  start: Date
  key: string
  done: number
  total: number
  rate: number | null
}

/** Completion per period for one frequency, oldest first. Missed periods count as incomplete. */
export function periodSeries(items: Item[], done: DoneSet, freq: Frequency, from: Date, to: Date): PeriodPoint[] {
  return periodsBetween(freq, from, to).map((start) => {
    const key = periodKey(freq, start)
    const active = items.filter((i) => activeIn(i, freq, start))
    const doneCount = active.filter((i) => done.has(doneKey(i.id, key))).length
    return {
      start,
      key,
      done: doneCount,
      total: active.length,
      rate: active.length ? doneCount / active.length : null,
    }
  })
}

export function summarize(points: PeriodPoint[]) {
  const done = points.reduce((s, p) => s + p.done, 0)
  const total = points.reduce((s, p) => s + p.total, 0)
  return { done, total, rate: total ? done / total : null }
}

export interface ItemStats {
  item: Item
  done: number
  total: number
  rate: number | null
  currentStreak: number
  bestStreak: number
  recent: { key: string; start: Date; done: boolean }[]
}

export function itemStats(item: Item, done: DoneSet, from: Date, today: Date): ItemStats {
  const freq = item.frequency
  const created = parseDay(item.createdOn)
  const allPeriods = periodsBetween(freq, created, today)
  const flags = allPeriods.map((p) => done.has(doneKey(item.id, periodKey(freq, p))))

  let best = 0
  let run = 0
  for (const f of flags) {
    run = f ? run + 1 : 0
    best = Math.max(best, run)
  }

  // The current period is still open, so an unchecked one doesn't break the streak yet.
  let i = flags.length - 1
  if (i >= 0 && !flags[i]) i--
  let current = 0
  while (i >= 0 && flags[i]) {
    current++
    i--
  }

  const rangeStart = periodStart(freq, from)
  let inDone = 0
  let inTotal = 0
  allPeriods.forEach((p, idx) => {
    if (p >= rangeStart) {
      inTotal++
      if (flags[idx]) inDone++
    }
  })

  const recentCount = freq === 'daily' ? 14 : freq === 'weekly' ? 8 : 6
  const recent: ItemStats['recent'] = []
  for (let n = recentCount - 1; n >= 0; n--) {
    const start = periodStart(freq, shiftPeriod(freq, periodStart(freq, today), -n))
    const key = periodKey(freq, start)
    recent.push({ key, start, done: start >= periodStart(freq, created) ? done.has(doneKey(item.id, key)) : false })
  }

  return {
    item,
    done: inDone,
    total: inTotal,
    rate: inTotal ? inDone / inTotal : null,
    currentStreak: current,
    bestStreak: best,
    recent,
  }
}

export function byFrequency(items: Item[], done: DoneSet, from: Date, to: Date) {
  return FREQUENCIES.map((freq) => ({ freq, ...summarize(periodSeries(items, done, freq, from, to)) }))
}

export const pct = (r: number | null) => (r == null ? '–' : `${Math.round(r * 100)}%`)
