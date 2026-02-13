// app/app/api/roster/extract/route.ts
import { NextResponse } from 'next/server'
import { AiRosterService } from '@/lib/services/ai-roster'
import { supabaseClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    // Security: Verify user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    let extractedData;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())
      extractedData = await AiRosterService.extractFromContent(buffer, file.type)
    } else if (text) {
      extractedData = await AiRosterService.extractFromContent(text, 'text/plain')
    } else {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      students: extractedData,
      count: extractedData.length
    })

  } catch (error: any) {
    console.error('Roster extraction error:', error)
    return NextResponse.json({ error: error.message || 'Failed to process roster' }, { status: 500 })
  }
}