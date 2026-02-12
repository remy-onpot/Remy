'use client'

import { useCallback, useEffect, useRef } from 'react'
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { LocalSecurityEvent, OfflinePeriod, Answer } from '@/types'

type AnswerValue = {
  question_id: string
  selected_option_id?: string
  text_response?: string
  synced: boolean
  timestamp: number
}

type SecurityLogValue = {
  id: string
  event_type: string
  duration_seconds?: number
  timestamp: number
  synced: boolean
}

type OfflinePeriodValue = {
  id: string
  start: number
  end?: number
  events: LocalSecurityEvent[]
  synced: boolean
}

type SessionValue = {
  session_id: string
  quiz_id: string
  index_number: string
  device_fingerprint: string
  status: 'in_progress' | 'submitted' | 'flagged'
  synced: boolean
}

// Union of all possible store value types
type StoreValue = AnswerValue | SecurityLogValue | OfflinePeriodValue | SessionValue

// Declare ExamDB as any to avoid DBSchema union constraints
type ExamDB = any

const DB_NAME = 'midsem-exam-db'
const DB_VERSION = 1

export function useIndexedDB(sessionId: string) {
  const dbRef = useRef<IDBPDatabase<ExamDB> | null>(null)

  useEffect(() => {
    const initDB = async () => {
      const db = await openDB<ExamDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Answers store
          if (!db.objectStoreNames.contains('answers')) {
            const answerStore = db.createObjectStore('answers', { keyPath: 'question_id' })
            answerStore.createIndex('by-synced', 'synced')
          }

          // Security logs store
          if (!db.objectStoreNames.contains('security_logs')) {
            const logStore = db.createObjectStore('security_logs', { keyPath: 'id' })
            logStore.createIndex('by-synced', 'synced')
          }

          // Offline periods store
          if (!db.objectStoreNames.contains('offline_periods')) {
            const periodStore = db.createObjectStore('offline_periods', { keyPath: 'id' })
            periodStore.createIndex('by-synced', 'synced')
          }

          // Session store
          if (!db.objectStoreNames.contains('session')) {
            db.createObjectStore('session', { keyPath: 'session_id' })
          }
        },
      })
      dbRef.current = db
    }

    initDB()

    return () => {
      dbRef.current?.close()
    }
  }, [sessionId])

  const saveAnswer = useCallback(async (answer: {
    question_id: string
    selected_option_id?: string
    text_response?: string
  }) => {
    if (!dbRef.current) return

    await dbRef.current.put('answers', {
      ...answer,
      synced: false,
      timestamp: Date.now(),
    })
  }, [])

  const getUnsyncedAnswers = useCallback(async () => {
    if (!dbRef.current) return []

    const tx = dbRef.current.transaction('answers', 'readonly')
    const store = tx.objectStore('answers')
    const index = store.index('by-synced')
    return await index.getAll(IDBKeyRange.only(false))
  }, [])

  const markAnswersSynced = useCallback(async (questionIds: string[]) => {
    if (!dbRef.current) return

    const tx = dbRef.current.transaction('answers', 'readwrite')
    const store = tx.objectStore('answers')

    for (const questionId of questionIds) {
      const answer = await store.get(questionId)
      if (answer) {
        answer.synced = true
        await store.put(answer)
      }
    }
  }, [])

  const saveSecurityEvent = useCallback(async (event: LocalSecurityEvent) => {
    if (!dbRef.current) return

    const id = `${sessionId}-${event.timestamp}-${event.type}`
    await dbRef.current.put('security_logs', {
      id,
      event_type: event.type,
      duration_seconds: event.duration,
      timestamp: event.timestamp,
      synced: false,
    })
  }, [sessionId])

  const getUnsyncedSecurityLogs = useCallback(async () => {
    if (!dbRef.current) return []

    const tx = dbRef.current.transaction('security_logs', 'readonly')
    const store = tx.objectStore('security_logs')
    const index = store.index('by-synced')
    return await index.getAll(IDBKeyRange.only(false))
  }, [])

  const markSecurityLogsSynced = useCallback(async (logIds: string[]) => {
    if (!dbRef.current) return

    const tx = dbRef.current.transaction('security_logs', 'readwrite')
    const store = tx.objectStore('security_logs')

    for (const logId of logIds) {
      const log = await store.get(logId)
      if (log) {
        log.synced = true
        await store.put(log)
      }
    }
  }, [])

  const startOfflinePeriod = useCallback(async () => {
    if (!dbRef.current) return

    const id = `${sessionId}-offline-${Date.now()}`
    await dbRef.current.put('offline_periods', {
      id,
      start: Date.now(),
      events: [],
      synced: false,
    })
    return id
  }, [sessionId])

  const endOfflinePeriod = useCallback(async (periodId: string, events: LocalSecurityEvent[]) => {
    if (!dbRef.current) return

    const period = await dbRef.current.get('offline_periods', periodId)
    if (period) {
      period.end = Date.now()
      period.events = events
      await dbRef.current.put('offline_periods', period)
    }
  }, [])

  const getUnsyncedOfflinePeriods = useCallback(async () => {
    if (!dbRef.current) return []

    const tx = dbRef.current.transaction('offline_periods', 'readonly')
    const store = tx.objectStore('offline_periods')
    const index = store.index('by-synced')
    return await index.getAll(IDBKeyRange.only(false))
  }, [])

  const clearSessionData = useCallback(async () => {
    if (!dbRef.current) return

    await dbRef.current.clear('answers')
    await dbRef.current.clear('security_logs')
    await dbRef.current.clear('offline_periods')
    await dbRef.current.delete('session', sessionId)
  }, [sessionId])

  return {
    saveAnswer,
    getUnsyncedAnswers,
    markAnswersSynced,
    saveSecurityEvent,
    getUnsyncedSecurityLogs,
    markSecurityLogsSynced,
    startOfflinePeriod,
    endOfflinePeriod,
    getUnsyncedOfflinePeriods,
    clearSessionData,
  }
}
