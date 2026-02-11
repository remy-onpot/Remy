import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const payload = await request.json()
    
    const { session_token, timestamp, focus_status, battery_level, is_fullscreen } = payload

    if (!session_token) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 400 }
      )
    }

    // Update session's last activity
    const { error } = await supabase
      .from('exam_sessions')
      .update({
        last_heartbeat: new Date(timestamp).toISOString(),
        focus_status,
        battery_level,
        is_fullscreen,
      })
      .eq('id', session_token)

    if (error) {
      console.error('Heartbeat update error:', error)
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
