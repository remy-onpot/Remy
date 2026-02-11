'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SecurityEventType, LocalSecurityEvent, SecurityState } from '@/types'

interface SecurityMonitorOptions {
  sessionId: string
  onStrike: (strikes: number) => void
  onWarning: (message: string) => void
  onAutoSubmit: () => void
  strictness: 'low' | 'medium' | 'high'
}

const STRIKE_THRESHOLDS = {
  low: { warning: 5000, strike: 30000, maxStrikes: 5 },
  medium: { warning: 3000, strike: 15000, maxStrikes: 3 },
  high: { warning: 2000, strike: 10000, maxStrikes: 3 },
}

export function useSecurityMonitor({
  sessionId,
  onStrike,
  onWarning,
  onAutoSubmit,
  strictness,
}: SecurityMonitorOptions) {
  const [securityState, setSecurityState] = useState<SecurityState>({
    strikes: 0,
    warnings: 0,
    last_focus_change: Date.now(),
    is_focused: true,
    is_fullscreen: false,
    offline_periods: [],
  })

  const lastCheckRef = useRef<number>(Date.now())
  const focusStartRef = useRef<number>(Date.now())
  const isFullscreenRef = useRef<boolean>(false)
  const eventsQueueRef = useRef<LocalSecurityEvent[]>([])
  const timeWarpIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const threshold = STRIKE_THRESHOLDS[strictness]

  // Record security event
  const recordEvent = useCallback((type: SecurityEventType, duration?: number) => {
    const event: LocalSecurityEvent = {
      type,
      timestamp: Date.now(),
      duration,
    }
    eventsQueueRef.current.push(event)

    // Also dispatch to server if online
    if (navigator.onLine) {
      fetch('/api/security-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: type,
          duration_seconds: duration,
        }),
      }).catch(() => {
        // Silently fail - event is already in local queue
      })
    }
  }, [sessionId])

  // Handle focus change
  const handleFocusChange = useCallback((isFocused: boolean) => {
    const now = Date.now()
    const awayDuration = now - focusStartRef.current

    if (!isFocused) {
      // Lost focus
      focusStartRef.current = now
      setSecurityState(prev => ({ ...prev, is_focused: false }))

      if (awayDuration > threshold.warning) {
        setSecurityState(prev => {
          const newWarnings = prev.warnings + 1
          if (awayDuration > threshold.strike) {
            const newStrikes = prev.strikes + 1
            recordEvent('focus_lost', Math.floor(awayDuration / 1000))
            onStrike(newStrikes)

            if (newStrikes >= threshold.maxStrikes) {
              onAutoSubmit()
            }
            return { ...prev, strikes: newStrikes, warnings: 0 }
          }
          onWarning(`Warning: You were away for ${Math.floor(awayDuration / 1000)}s`)
          return { ...prev, warnings: newWarnings }
        })
      }
    } else {
      // Gained focus
      setSecurityState(prev => ({ ...prev, is_focused: true }))
      focusStartRef.current = now
    }
  }, [threshold, onStrike, onWarning, onAutoSubmit, recordEvent])

  // Time Warp Detective - detects when app was suspended (mobile)
  const startTimeWarpDetection = useCallback(() => {
    lastCheckRef.current = Date.now()

    timeWarpIntervalRef.current = setInterval(() => {
      const now = Date.now()
      const expectedDelta = 1000 // 1 second interval
      const actualDelta = now - lastCheckRef.current
      const drift = actualDelta - expectedDelta

      // If drift is more than 2 seconds, app was likely suspended
      if (drift > 2000) {
        const suspendedDuration = Math.floor(drift / 1000)
        recordEvent('time_warp', suspendedDuration)
        onWarning(`Suspicious gap detected: ${suspendedDuration}s`)

        setSecurityState(prev => {
          const newStrikes = prev.strikes + 1
          if (newStrikes >= threshold.maxStrikes) {
            onAutoSubmit()
          }
          return { ...prev, strikes: newStrikes }
        })
      }

      lastCheckRef.current = now
    }, 1000)
  }, [onWarning, onAutoSubmit, recordEvent, threshold])

  // Fullscreen enforcement
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        await elem.requestFullscreen()
        isFullscreenRef.current = true
        setSecurityState(prev => ({ ...prev, is_fullscreen: true }))
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }, [])

  const handleFullscreenChange = useCallback(() => {
    const isFullscreen = !!document.fullscreenElement
    isFullscreenRef.current = isFullscreen
    setSecurityState(prev => ({ ...prev, is_fullscreen: isFullscreen }))

    if (!isFullscreen) {
      recordEvent('fullscreen_exit')
      onWarning('Fullscreen mode exited')

      setSecurityState(prev => {
        const newStrikes = prev.strikes + 1
        if (newStrikes >= threshold.maxStrikes) {
          onAutoSubmit()
        }
        return { ...prev, strikes: newStrikes }
      })

      // Try to re-enter fullscreen
      setTimeout(() => {
        enterFullscreen()
      }, 100)
    }
  }, [onWarning, onAutoSubmit, recordEvent, threshold, enterFullscreen])

  // Setup event listeners
  useEffect(() => {
    // Visibility API
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      handleFocusChange(isVisible)
      if (!isVisible) {
        recordEvent('tab_switch')
      }
    }

    // Focus/Blur API
    const handleFocus = () => handleFocusChange(true)
    const handleBlur = () => handleFocusChange(false)

    // Mouse leave
    const handleMouseLeave = () => {
      recordEvent('mouse_leave')
      onWarning('Mouse left the exam window')
    }

    // Fullscreen change
    const handleFullscreen = () => handleFullscreenChange()

    // Online/Offline
    const handleOnline = () => {
      console.log('Connection restored')
    }
    const handleOffline = () => {
      recordEvent('network_disconnect')
      onWarning('Connection lost - continuing in offline mode')
    }

    // Add listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('fullscreenchange', handleFullscreen)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Start time warp detection
    startTimeWarpDetection()

    // Enter fullscreen
    enterFullscreen()

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('fullscreenchange', handleFullscreen)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (timeWarpIntervalRef.current) {
        clearInterval(timeWarpIntervalRef.current)
      }
    }
  }, [handleFocusChange, handleFullscreenChange, startTimeWarpDetection, enterFullscreen, onWarning, recordEvent])

  return {
    securityState,
    eventsQueue: eventsQueueRef.current,
    enterFullscreen,
    recordEvent,
  }
}
