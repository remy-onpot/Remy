import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const payload = await request.json()
    
    const { session_id, event_type, duration_seconds } = payload

    if (!session_id || !event_type) {
      return NextResponse.json(
        { error: 'Session ID and event type required' },
        { status: 400 }
      )
    }

    // Insert security log
    const { error } = await supabase
      .from('security_logs')
      .insert({
        session_id,
        event_type,
        duration_seconds,
        occurred_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Security log error:', error)
      return NextResponse.json(
        { error: 'Failed to log security event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Security log error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
