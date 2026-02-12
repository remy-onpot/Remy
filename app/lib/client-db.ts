// app/lib/client-db.ts
import { supabaseClient } from './supabase'
import { LocalSecurityEvent } from '@/types'

const DB_NAME = 'midsem_proctor_db'
const STORE_NAME = 'security_logs_queue'
const DB_VERSION = 1

// 1. Open IndexedDB (The Browser's Black Box)
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return // Server-side safety

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// 2. Save Log to Black Box (Offline Safe)
export const saveLogToIndexedDB = async (event: LocalSecurityEvent) => {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    // Add processed flag to ensure we don't double-sync
    const request = store.add({ ...event, synced: false })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// 3. Sync to Server (Background Process)
export const syncLogsToServer = async () => {
  const db = await openDB()
  
  // A. Fetch all unsynced logs
  const logsToSync = await new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  if (logsToSync.length === 0) return

  // B. Format for Supabase
  const formattedLogs = logsToSync.map(log => ({
    session_id: log.sessionId, // This maps the IDB field to Supabase column
    event_type: log.type,
    duration_seconds: log.duration || 0,
    occurred_at: new Date(log.timestamp).toISOString()
  }))

  // C. Upload to Supabase
  const { error } = await supabaseClient
    .from('security_logs')
    .insert(formattedLogs)

  if (error) {
    console.error("Sync failed:", error)
    throw error // Retry later
  }

  // D. Clear Local Logs (Only on success)
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  store.clear() // Or delete specific IDs if you want to be safer
}