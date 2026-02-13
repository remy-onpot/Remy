import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'
import { AiGradingService } from '@/lib/services/ai-grading'

export async function POST(req: Request) {
  try {
    // 1. Security Check
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId, questionId, questionContent, studentAnswer, sampleAnswer, maxPoints } = await req.json()

    if (!sessionId || !questionId || !questionContent || !studentAnswer || !sampleAnswer || maxPoints === undefined) {
      return NextResponse.json({ error: 'Missing required grading parameters' }, { status: 400 })
    }

    // 2. Call the Gemini Service
    const aiResult = await AiGradingService.gradeAnswer(
      questionContent,
      studentAnswer,
      sampleAnswer,
      maxPoints
    )

    // 3. Save the AI's suggestion to the database (so it persists even before lecturer approves)
    const { error: dbError } = await supabaseClient
      .from('answers')
      .update({
        ai_score: aiResult.score,
        ai_feedback: aiResult.feedback
      })
      .eq('session_id', sessionId)
      .eq('question_id', questionId)

    if (dbError) throw new Error('Failed to save AI suggestion to database')

    // 4. Return to frontend
    return NextResponse.json({ 
      success: true, 
      score: aiResult.score,
      feedback: aiResult.feedback
    }, { status: 200 })

  } catch (error: any) {
    console.error('AI Grading API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate AI grade' }, { status: 500 })
  }
}