import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const payload = await request.json()
    
    const { 
      session_token, 
      timestamp, 
      focus_status, 
      battery_level, 
      is_fullscreen,
      user_agent 
    } = payload

    if (!session_token) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 400 }
      )
    }

    // Get the existing session to check original user agent
    const { data: session, error: fetchError } = await supabase
      .from('exam_sessions')
      .select('user_agent, status, strikes')
      .eq('id', session_token)
      .single()

    if (fetchError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // SECURITY CHECK: Validate User-Agent hasn't changed
    let warning = null
    let shouldFlag = false
    
    if (session.user_agent && user_agent && session.user_agent !== user_agent) {
      console.warn(`[SECURITY] User-Agent mismatch detected for session ${session_token}`)
      console.warn(`Original: ${session.user_agent}`)
      console.warn(`Current: ${user_agent}`)
      
      warning = 'Browser signature change detected. This activity has been logged.'
      shouldFlag = true
      
      // Log the security violation with detailed metadata
      await supabase.from('security_logs').insert({
        session_id: session_token,
        event_type: 'user_agent_mismatch',
        metadata: {
          original_ua: session.user_agent,
          current_ua: user_agent,
          severity: 'high',
          timestamp: new Date().toISOString(),
        },
      })
      
      // Flag session if it already has strikes or if this is critical
      if (session.strikes >= 2 || session.status === 'in_progress') {
        shouldFlag = true
      }
    }

    // Update session's last activity
    const updateData: any = {
      last_heartbeat: new Date(timestamp).toISOString(),
      focus_status,
      battery_level,
      is_fullscreen,
    }
    
    // Auto-flag on User-Agent mismatch
    if (shouldFlag && session.status === 'in_progress') {
      updateData.status = 'flagged'
      updateData.strikes = (session.strikes || 0) + 1
    }
    
    // @ts-ignore - Supabase type inference issue  
    const { error } = await supabase
      .from('exam_sessions')
      .update(updateData)
      .eq('id', session_token)

    if (error) {
      console.error('Heartbeat update error:', error)
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      warning,
      flagged: shouldFlag,
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
