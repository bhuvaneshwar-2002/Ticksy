import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { type Item, db, exportBackup, importBackup } from '../db'
import FreqTabs, { freqColor } from '../FreqTabs'
import { type Frequency, FREQUENCIES, FREQ_LABEL, dayKey } from '../periods'
import { usePersisted } from '../usePersisted'

export default function Settings() {
  const items = useLiveQuery(() => db.items.orderBy('order').toArray(), [])
  const [title, setTitle] = useState('')
  const [freq, setFreq] = usePersisted<Frequency>('settings.freq', 'daily')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  if (!items) return null

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    const maxOrder = items.reduce((m, i) => Math.max(m, i.order), 0)
    await db.items.add({ title: t, frequency: freq, createdOn: dayKey(new Date()), order: maxOrder + 1, archived: false } as Item)
    setTitle('')
  }

  const doExport = async () => {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `daily-checklist-backup-${dayKey(new Date())}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (!confirm('Replace all current items and history with this backup?')) return
      await importBackup(data)
      setMessage('Backup restored.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  return (
    <>
      <section className="card">
        <h2>Add an item</h2>
        <p className="sub">Choose how often it should be checked. It shows up under that tab on the Checklist page.</p>
        <form className="row add-form" onSubmit={add}>
          <input
            className="input grow"
            placeholder="e.g. Drink 2L water"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Item title"
          />
          <FreqTabs value={freq} onChange={setFreq} />
          <button className="btn primary" type="submit" disabled={!title.trim()}>
            Add
          </button>
        </form>
      </section>

      {FREQUENCIES.map((f) => {
        const list = items.filter((i) => i.frequency === f)
        return (
          <section className="card" key={f}>
            <h2 className="row">
              <span className="dot" style={{ background: freqColor(f) }} />
              {FREQ_LABEL[f]} items <span className="tag">{list.length}</span>
            </h2>
            {list.length === 0 ? (
              <p className="note">None yet.</p>
            ) : (
              list.map((item, idx) => (
                <ItemRow key={item.id} item={item} prev={list[idx - 1]} next={list[idx + 1]} />
              ))
            )}
          </section>
        )
      })}

      <section className="card">
        <h2>Backup</h2>
        <p className="sub">
          Your data lives only in this browser. Export a backup now and then, and import it to move to another device or
          browser.
        </p>
        <div className="row">
          <button className="btn" onClick={doExport}>
            Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) doImport(file)
              e.target.value = ''
            }}
          />
          {message && <span className="note">{message}</span>}
        </div>
      </section>
    </>
  )
}

function ItemRow({ item, prev, next }: { item: Item; prev?: Item; next?: Item }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [frequency, setFrequency] = useState<Frequency>(item.frequency)
  const [createdOn, setCreatedOn] = useState(item.createdOn)

  const swap = async (other?: Item) => {
    if (!other) return
    await db.transaction('rw', db.items, async () => {
      await db.items.update(item.id, { order: other.order })
      await db.items.update(other.id, { order: item.order })
    })
  }

  const remove = async () => {
    if (!confirm(`Delete "${item.title}" and all of its history?`)) return
    await db.transaction('rw', db.items, db.completions, async () => {
      await db.completions.where('itemId').equals(item.id).delete()
      await db.items.delete(item.id)
    })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !createdOn) return
    await db.items.update(item.id, { title: title.trim(), frequency, createdOn })
    setEditing(false)
  }

  if (editing) {
    return (
      <form className="settings-item edit-form" onSubmit={save}>
        <input className="input title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} aria-label="Frequency">
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQ_LABEL[f]}
            </option>
          ))}
        </select>
        <label className="row note">
          Counts from
          <input className="input" type="date" value={createdOn} max={dayKey(new Date())} onChange={(e) => setCreatedOn(e.target.value)} />
        </label>
        <button className="btn primary" type="submit">
          Save
        </button>
        <button className="btn" type="button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div className="settings-item">
      <span className={`title${item.archived ? ' paused' : ''}`}>
        {item.title} {item.archived && <span className="tag">Paused</span>}
      </span>
      <div className="item-actions">
        <button className="btn icon" onClick={() => swap(prev)} disabled={!prev} aria-label="Move up">
          ↑
        </button>
        <button className="btn icon" onClick={() => swap(next)} disabled={!next} aria-label="Move down">
          ↓
        </button>
        <button className="btn" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="btn" onClick={() => db.items.update(item.id, { archived: !item.archived })}>
          {item.archived ? 'Resume' : 'Pause'}
        </button>
        <button className="btn danger" onClick={remove}>
          Delete
        </button>
      </div>
    </div>
  )
}
