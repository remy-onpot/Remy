import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase' // Point to your file
import { AiQuizService } from '@/lib/services/ai-quiz'

// Force dynamic rendering to avoid build-time evaluation
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. SECURITY: Get the token from the request header
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    // 2. Verify the user using your existing client
    const supabase = createServerClient()
    const token = authHeader.replace('Bearer ', '')
    
    // valid access tokens allow getUser to succeed
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 })
    }

    // 3. PARSE INPUT (File or Paste)
    const contentType = req.headers.get('content-type') || ''
    let content: Buffer | string
    let mimeType: string

    if (contentType.includes('application/json')) {
      const body = await req.json()
      content = body.text
      mimeType = 'text/plain'
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      }
      
      const bytes = await file.arrayBuffer()
      content = Buffer.from(bytes)
      mimeType = file.type
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 })
    }

    // 4. EXECUTE SERVICE
    const quizData = await AiQuizService.extractFromContent(content, mimeType)

    return NextResponse.json(quizData)

  } catch (error: any) {
    console.error('Quiz Extraction Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process document' }, 
      { status: 500 }
    )
  }
}