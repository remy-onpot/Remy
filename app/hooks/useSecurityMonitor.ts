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

// Fair violation detection thresholds
const BLUR_THRESHOLD_MS = 5000 // Only flag if blur lasts > 5 seconds
const VIOLATION_COOLDOWN_MS = 2000 // Prevent duplicate violations

const STRIKE_THRESHOLDS = {
  low: { warning: 10000, strike: 30000, maxStrikes: 5 },
  medium: { warning: 7000, strike: 20000, maxStrikes: 3 },
  high: { warning: 5000, strike: 15000, maxStrikes: 3 },
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
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isFullscreenRef = useRef<boolean>(false)
  const eventsQueueRef = useRef<LocalSecurityEvent[]>([])
  const timeWarpIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastViolationRef = useRef<number>(0) // Cooldown tracker

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

  // Handle focus change with fair debounced detection
  const handleFocusChange = useCallback((isFocused: boolean) => {
    const now = Date.now()

    if (!isFocused) {
      // Lost focus - start timer
      focusStartRef.current = now
      setSecurityState(prev => ({ ...prev, is_focused: false }))

      // Clear any existing timer
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current)
      }

      // Start new timer - only flag if blur persists beyond threshold
      blurTimerRef.current = setTimeout(() => {
        const blurDuration = Date.now() - focusStartRef.current

        // Check cooldown to prevent duplicate violations
        if (now - lastViolationRef.current < VIOLATION_COOLDOWN_MS) {
          return
        }

        lastViolationRef.current = now

        // Log violation and apply strike
        recordEvent('focus_lost', Math.floor(blurDuration / 1000))
        
        setSecurityState(prev => {
          const newStrikes = prev.strikes + 1
          const newWarnings = prev.warnings + 1
          
          onWarning(`Warning: You were away for ${Math.floor(blurDuration / 1000)}s`)
          onStrike(newStrikes)

          if (newStrikes >= threshold.maxStrikes) {
            onAutoSubmit()
          }
          
          return { ...prev, strikes: newStrikes, warnings: newWarnings }
        })
      }, BLUR_THRESHOLD_MS)
    } else {
      // Gained focus - cancel timer if still running
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current)
        blurTimerRef.current = null
      }
      
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

  // Fullscreen enforcement (only on high strictness)
  const enterFullscreen = useCallback(async () => {
    if (strictness !== 'high') return // Only enforce on high strictness

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
  }, [strictness])

  const handleFullscreenChange = useCallback(() => {
    if (strictness !== 'high') return // Only enforce on high strictness

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
  }, [strictness, onWarning, onAutoSubmit, recordEvent, threshold, enterFullscreen])

  // Setup event listeners
  useEffect(() => {
    // Visibility API (tab switches)
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

    // Right-click prevention (medium/high strictness only)
    const handleContextMenu = (e: MouseEvent) => {
      if (strictness === 'medium' || strictness === 'high') {
        e.preventDefault()
        recordEvent('mouse_leave') // Reusing this event type for right-click
        onWarning('Right-click is disabled during the exam')
      }
    }

    // Copy/Paste detection (medium/high strictness only)
    const handleCopy = (e: ClipboardEvent) => {
      if (strictness === 'medium' || strictness === 'high') {
        e.preventDefault()
        recordEvent('mouse_leave') // Reusing for copy attempts
        onWarning('Copying is disabled during the exam')
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (strictness === 'medium' || strictness === 'high') {
        e.preventDefault()
        recordEvent('mouse_leave') // Reusing for paste attempts
        onWarning('Pasting is disabled during the exam')
      }
    }

    // Fullscreen change (high strictness only)
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
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('fullscreenchange', handleFullscreen)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Start time warp detection
    startTimeWarpDetection()

    // Enter fullscreen (only on high strictness)
    if (strictness === 'high') {
      enterFullscreen()
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('fullscreenchange', handleFullscreen)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      // Clear blur timer
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current)
      }

      if (timeWarpIntervalRef.current) {
        clearInterval(timeWarpIntervalRef.current)
      }
    }
  }, [handleFocusChange, handleFullscreenChange, startTimeWarpDetection, enterFullscreen, onWarning, recordEvent, strictness])

  return {
    securityState,
    eventsQueue: eventsQueueRef.current,
    enterFullscreen,
    recordEvent,
  }
}
