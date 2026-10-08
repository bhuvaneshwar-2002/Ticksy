export type Frequency = 'daily' | 'weekly' | 'monthly'

export const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly']

export const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Weeks start on Monday. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d)
  const offset = (s.getDay() + 6) % 7
  return addDays(s, -offset)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function periodStart(freq: Frequency, d: Date): Date {
  if (freq === 'daily') return startOfDay(d)
  if (freq === 'weekly') return startOfWeek(d)
  return startOfMonth(d)
}

export function periodEnd(freq: Frequency, d: Date): Date {
  const s = periodStart(freq, d)
  if (freq === 'daily') return s
  if (freq === 'weekly') return addDays(s, 6)
  return new Date(s.getFullYear(), s.getMonth() + 1, 0)
}

/** Stable key identifying the period containing `d`. */
export function periodKey(freq: Frequency, d: Date): string {
  const s = periodStart(freq, d)
  if (freq === 'daily') return dayKey(s)
  if (freq === 'weekly') return `W${dayKey(s)}`
  return `${s.getFullYear()}-${pad(s.getMonth() + 1)}`
}

export function shiftPeriod(freq: Frequency, d: Date, n: number): Date {
  if (freq === 'daily') return addDays(d, n)
  if (freq === 'weekly') return addDays(d, 7 * n)
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/** All period starts of `freq` overlapping [from, to], oldest first. */
export function periodsBetween(freq: Frequency, from: Date, to: Date): Date[] {
  const out: Date[] = []
  let cur = periodStart(freq, from)
  const end = startOfDay(to)
  while (cur <= end) {
    out.push(cur)
    cur = periodStart(freq, shiftPeriod(freq, cur, 1))
  }
  return out
}

const fmtShort = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const fmtMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

export function formatShort(d: Date): string {
  return fmtShort.format(d)
}

export function periodLabel(freq: Frequency, d: Date): string {
  if (freq === 'daily') return fmtLong.format(d)
  if (freq === 'weekly') {
    const s = startOfWeek(d)
    return `Week of ${fmtShort.format(s)} – ${fmtShort.format(addDays(s, 6))}`
  }
  return fmtMonth.format(d)
}
