'use client'

import { useCallback, useEffect, useRef } from 'react'

interface HeartbeatOptions {
  sessionId: string
  interval?: number
  onDisconnect?: () => void
  onReconnect?: () => void
}

export function useHeartbeat({
  sessionId,
  interval = 10000, // 10 seconds default
  onDisconnect,
  onReconnect,
}: HeartbeatOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isOnlineRef = useRef<boolean>(true)
  const lastHeartbeatRef = useRef<number>(Date.now())

  const sendHeartbeat = useCallback(async () => {
    try {
      const battery = await (navigator as any).getBattery?.().catch(() => null)
      
      const payload = {
        session_token: sessionId,
        timestamp: Date.now(),
        focus_status: document.visibilityState === 'visible' ? 'focused' : 'hidden',
        battery_level: battery?.level,
        is_fullscreen: !!document.fullscreenElement,
      }

      const response = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        lastHeartbeatRef.current = Date.now()
        
        if (!isOnlineRef.current) {
          isOnlineRef.current = true
          onReconnect?.()
        }
      } else {
        throw new Error('Heartbeat failed')
      }
    } catch (error) {
      console.error('Heartbeat error:', error)
      
      if (isOnlineRef.current) {
        isOnlineRef.current = false
        onDisconnect?.()
      }
    }
  }, [sessionId, onDisconnect, onReconnect])

  const startHeartbeat = useCallback(() => {
    if (intervalRef.current) return

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, interval)
  }, [sendHeartbeat, interval])

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const getLastHeartbeat = useCallback(() => {
    return lastHeartbeatRef.current
  }, [])

  const isOnline = useCallback(() => {
    return isOnlineRef.current
  }, [])

  useEffect(() => {
    return () => {
      stopHeartbeat()
    }
  }, [stopHeartbeat])

  return {
    startHeartbeat,
    stopHeartbeat,
    sendHeartbeat,
    getLastHeartbeat,
    isOnline,
  }
}
