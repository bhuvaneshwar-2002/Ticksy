import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db'
import FreqTabs, { freqColor } from '../FreqTabs'
import {
  type Frequency,
  FREQUENCIES,
  FREQ_LABEL,
  addDays,
  formatShort,
  periodKey,
  periodLabel,
  startOfDay,
  startOfWeek,
} from '../periods'
import { activeIn, buildDoneSet, byFrequency, doneKey, itemStats, pct, periodSeries, summarize } from '../stats'
import { usePersisted } from '../usePersisted'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
]

const axisTick = { fill: 'var(--muted)', fontSize: 12 }

export default function Dashboard() {
  const [rangeDays, setRangeDays] = usePersisted<number>('dash.range', 30)
  const [trendFreq, setTrendFreq] = usePersisted<Frequency>('dash.trend', 'daily')
  const items = useLiveQuery(() => db.items.toArray(), [])
  const completions = useLiveQuery(() => db.completions.toArray(), [])

  if (!items || !completions) return null

  const active = items.filter((i) => !i.archived)
  if (active.length === 0) {
    return (
      <section className="card empty">
        Nothing to chart yet. <Link to="/settings">Add checklist items</Link> and tick them off to see your progress here.
      </section>
    )
  }

  const today = startOfDay(new Date())
  const from = addDays(today, -(rangeDays - 1))
  const done = buildDoneSet(completions)

  // Headline tiles: the current period of each frequency.
  const currentTiles = FREQUENCIES.map((f) => {
    const list = items.filter((i) => activeIn(i, f, today))
    const k = periodKey(f, today)
    const n = list.filter((i) => done.has(doneKey(i.id, k))).length
    return { f, n, total: list.length }
  })
  const overall = summarize(FREQUENCIES.flatMap((f) => periodSeries(items, done, f, from, today)))
  const stats = active
    .map((i) => itemStats(i, done, from, today))
    .sort((a, b) => FREQUENCIES.indexOf(a.item.frequency) - FREQUENCIES.indexOf(b.item.frequency) || a.item.order - b.item.order)
  const topStreak = stats.reduce((best, s) => (s.currentStreak > best.currentStreak ? s : best), stats[0])

  const trend = periodSeries(items, done, trendFreq, from, today)
    .filter((p) => p.total > 0)
    .map((p) => ({
      label: trendFreq === 'monthly' ? periodLabel('monthly', p.start) : formatShort(p.start),
      full: periodLabel(trendFreq, p.start),
      rate: Math.round((p.rate ?? 0) * 100),
      done: p.done,
      total: p.total,
    }))

  const freqBars = byFrequency(items, done, from, today)
    .filter((b) => b.total > 0)
    .map((b) => ({ ...b, label: FREQ_LABEL[b.freq], pctValue: Math.round((b.rate ?? 0) * 100) }))

  return (
    <>
      <div className="row spread dash-head" style={{ marginBottom: 16 }}>
        <div className="seg" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.days} type="button" aria-pressed={rangeDays === r.days} onClick={() => setRangeDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="note">
          {formatShort(from)} – {formatShort(today)} · missed periods count as not done
        </span>
      </div>

      <div className="tiles">
        {currentTiles.map(
          (t) =>
            t.total > 0 && (
              <div className="tile" key={t.f}>
                <div className="k row">
                  <span className="dot" style={{ background: freqColor(t.f) }} />
                  {t.f === 'daily' ? 'Today' : t.f === 'weekly' ? 'This week' : 'This month'}
                </div>
                <div className="v">
                  {t.n}/{t.total}
                </div>
                <div className="s">{FREQ_LABEL[t.f].toLowerCase()} items done</div>
              </div>
            ),
        )}
        <div className="tile">
          <div className="k">Completion rate</div>
          <div className="v">{pct(overall.rate)}</div>
          <div className="s">
            {overall.done} of {overall.total} checks, last {rangeDays} days
          </div>
        </div>
        <div className="tile">
          <div className="k">Longest current streak</div>
          <div className="v">{topStreak.currentStreak}</div>
          <div className="s">{topStreak.currentStreak > 0 ? topStreak.item.title : 'Tick something off to start one'}</div>
        </div>
      </div>

      <section className="card">
        <div className="row spread">
          <div>
            <h2>Completion over time</h2>
            <p className="sub">Share of {trendFreq} items done in each period</p>
          </div>
          <FreqTabs value={trendFreq} onChange={setTrendFreq} />
        </div>
        {trend.length === 0 ? (
          <p className="empty">No {trendFreq} items in this range.</p>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={freqColor(trendFreq)} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={freqColor(trendFreq)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} minTickGap={24} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: 'var(--axis)' }}
                  content={({ active, payload }) => {
                    const p = active && payload?.[0]?.payload
                    if (!p) return null
                    return (
                      <div className="tooltip">
                        <div className="t">{p.full}</div>
                        <strong>{p.rate}%</strong> · {p.done} of {p.total} done
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke={freqColor(trendFreq)}
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  dot={trend.length <= 31 ? { r: 3, strokeWidth: 0, fill: freqColor(trendFreq) } : false}
                  activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <section className="card">
          <h2>By frequency</h2>
          <p className="sub">Completion rate, last {rangeDays} days</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={freqBars} margin={{ top: 18, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} unit="%" tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  content={({ active, payload }) => {
                    const p = active && payload?.[0]?.payload
                    if (!p) return null
                    return (
                      <div className="tooltip">
                        <div className="t">{p.label}</div>
                        <strong>{p.pctValue}%</strong> · {p.done} of {p.total} checks
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="pctValue"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={56}
                  isAnimationActive={false}
                  label={{ position: 'top', fill: 'var(--text-2)', fontSize: 12, formatter: (v) => `${v}%` }}
                >
                  {freqBars.map((b) => (
                    <Cell key={b.freq} fill={freqColor(b.freq)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <h2>Daily activity</h2>
          <p className="sub">Share of daily items done each day, last 16 weeks</p>
          <Heatmap items={items} done={done} today={today} />
        </section>
      </div>

      <section className="card">
        <h2>Per item</h2>
        <p className="sub">Rate over the last {rangeDays} days, streaks, and the most recent periods (newest on the right)</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Rate</th>
                <th className="num">Streak</th>
                <th className="num">Best</th>
                <th>Recent</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.item.id}>
                  <td>
                    <span className="row" style={{ flexWrap: 'nowrap' }}>
                      <span className="dot" style={{ background: freqColor(s.item.frequency) }} title={FREQ_LABEL[s.item.frequency]} />
                      {s.item.title}
                    </span>
                  </td>
                  <td className="num">{pct(s.rate)}</td>
                  <td className="num">{s.currentStreak}</td>
                  <td className="num">{s.bestStreak}</td>
                  <td>
                    <div className="pips">
                      {s.recent.map((r) => (
                        <span
                          key={r.key}
                          className="pip"
                          title={`${periodLabel(s.item.frequency, r.start)}: ${r.done ? 'done' : 'not done'}`}
                          style={r.done ? { background: freqColor(s.item.frequency) } : undefined}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function Heatmap({ items, done, today }: { items: Parameters<typeof periodSeries>[0]; done: Set<string>; today: Date }) {
  const start = addDays(startOfWeek(today), -15 * 7)
  const days = periodSeries(items, done, 'daily', start, addDays(startOfWeek(today), 6))
  const level = (rate: number | null) => (rate == null ? 0 : rate === 0 ? 0 : Math.min(5, 1 + Math.floor(rate * 4.999)))
  const todayKey = periodKey('daily', today)
  const todayIdx = days.findIndex((d) => d.key === todayKey)

  return (
    <>
      <div className="heat" role="img" aria-label="Daily completion heatmap">
        {days.map((d, i) => (
          <span
            key={d.key}
            className="cell"
            title={i > todayIdx ? formatShort(d.start) : `${formatShort(d.start)}: ${d.total ? `${d.done} of ${d.total} done` : 'no daily items'}`}
            style={{
              background: i > todayIdx ? 'transparent' : `var(--seq-${level(d.rate)})`,
              outline: d.key === todayKey ? '2px solid var(--text-2)' : undefined,
              outlineOffset: -1,
            }}
          />
        ))}
      </div>
      <div className="legend">
        Less
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <span key={l} className="pip" style={{ background: `var(--seq-${l})` }} />
        ))}
        More · rows Mon–Sun
      </div>
    </>
  )
}
