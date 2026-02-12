'use client'

import { useCallback, useEffect, useRef } from 'react'

interface HeartbeatOptions {
  sessionId: string
  interval?: number
  onDisconnect?: () => void
  onReconnect?: () => void
  onSecurityWarning?: (message: string, flagged: boolean) => void
}

export function useHeartbeat({
  sessionId,
  interval = 10000, // 10 seconds default
  onDisconnect,
  onReconnect,
  onSecurityWarning,
}: HeartbeatOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isOnlineRef = useRef<boolean>(true)
  const lastHeartbeatRef = useRef<number>(Date.now())

  // Track focus state with tolerance for brief mobile interruptions
  const focusedRecentlyRef = useRef<boolean>(true)
  const blurTimestampRef = useRef<number | null>(null)
  const MOBILE_FOCUS_GRACE_MS = 3000 // 3s grace for mobile glitches

  // Listen for visibility changes and track with grace period
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        focusedRecentlyRef.current = true
        blurTimestampRef.current = null
      } else {
        blurTimestampRef.current = Date.now()
        // Only mark as unfocused after the grace period
        setTimeout(() => {
          if (blurTimestampRef.current && Date.now() - blurTimestampRef.current >= MOBILE_FOCUS_GRACE_MS) {
            focusedRecentlyRef.current = false
          }
        }, MOBILE_FOCUS_GRACE_MS)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const sendHeartbeat = useCallback(async () => {
    try {
      const battery = await (navigator as any).getBattery?.().catch(() => null)
      const currentUserAgent = navigator.userAgent

      // Use the grace-period-aware focus state instead of raw visibilityState
      const isFocused = document.visibilityState === 'visible' || focusedRecentlyRef.current
      
      const payload = {
        session_token: sessionId,
        timestamp: Date.now(),
        focus_status: isFocused ? 'focused' : 'hidden',
        battery_level: battery?.level,
        is_fullscreen: !!document.fullscreenElement,
        user_agent: currentUserAgent,
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
        
        // Check for security warnings in response
        const data = await response.json()
        if (data.warning) {
          console.warn('Security warning:', data.warning)
          onSecurityWarning?.(data.warning, data.flagged || false)
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
  }, [sessionId, onDisconnect, onReconnect, onSecurityWarning])

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
