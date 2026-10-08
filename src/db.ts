import Dexie, { type EntityTable } from 'dexie'
import type { Frequency } from './periods'

export interface Item {
  id: number
  title: string
  frequency: Frequency
  /** YYYY-MM-DD the item became active; earlier periods are not counted. */
  createdOn: string
  order: number
  archived: boolean
}

export interface Completion {
  id: number
  itemId: number
  periodKey: string
  completedAt: number
}

export const db = new Dexie('daily-checklist') as Dexie & {
  items: EntityTable<Item, 'id'>
  completions: EntityTable<Completion, 'id'>
}

db.version(1).stores({
  items: '++id, frequency, order, archived',
  completions: '++id, itemId, periodKey, &[itemId+periodKey]',
})

// Ask the browser not to evict our data under storage pressure.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {})
}

export async function toggleCompletion(itemId: number, periodKey: string) {
  const existing = await db.completions.where({ itemId, periodKey }).first()
  if (existing) await db.completions.delete(existing.id)
  else await db.completions.add({ itemId, periodKey, completedAt: Date.now() } as Completion)
}

export interface Backup {
  app: 'daily-checklist'
  version: 1
  exportedAt: string
  items: Item[]
  completions: Completion[]
}

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'daily-checklist',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: await db.items.toArray(),
    completions: await db.completions.toArray(),
  }
}

export async function importBackup(data: Backup) {
  if (data?.app !== 'daily-checklist' || !Array.isArray(data.items) || !Array.isArray(data.completions)) {
    throw new Error('This file is not a Daily Checklist backup.')
  }
  await db.transaction('rw', db.items, db.completions, async () => {
    await db.items.clear()
    await db.completions.clear()
    await db.items.bulkAdd(data.items)
    await db.completions.bulkAdd(data.completions)
  })
}
