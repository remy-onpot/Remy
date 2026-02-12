import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Server-side Supabase client with service role key for secure operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, device_fingerprint } = body

    // Validate required fields
    if (!session_id || !device_fingerprint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch the exam session with quiz details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('exam_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify device fingerprint (prevent impersonation)
    if (session.device_fingerprint !== device_fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint mismatch - unauthorized submission' },
        { status: 403 }
      )
    }

    // Check if already submitted (prevent double submission)
    if (session.status === 'submitted' || session.completed_at) {
      return NextResponse.json(
        { error: 'Exam already submitted' },
        { status: 409 }
      )
    }

    // Fetch quiz settings
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('settings, strictness:settings')
      .eq('id', session.quiz_id)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    // Fetch all questions with their options
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('quiz_id', session.quiz_id)
      .order('position')

    if (questionsError || !questions) {
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      )
    }

    // Fetch options separately
    const { data: options, error: optionsError } = await supabaseAdmin
      .from('options')
      .select('*')

    if (optionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch options' },
        { status: 500 }
      )
    }

    // Map options to questions
    const optionsMap = new Map<string, any[]>()
    for (const option of options || []) {
      if (!optionsMap.has(option.question_id)) {
        optionsMap.set(option.question_id, [])
      }
      optionsMap.get(option.question_id)!.push(option)
    }

    // Fetch student's answers
    const { data: answers, error: answersError } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('session_id', session_id)

    if (answersError) {
      return NextResponse.json(
        { error: 'Failed to fetch answers' },
        { status: 500 }
      )
    }

    // Calculate score server-side (tamper-proof)
    let totalScore = 0
    let correctCount = 0
    const answerMap = new Map(answers?.map(a => [a.question_id, a]) || [])

    for (const question of questions) {
      const studentAnswer = answerMap.get(question.id)
      
      if (!studentAnswer) continue // Unanswered question

      const questionOptions = optionsMap.get(question.id) || []

      if (question.type === 'mcq' || question.type === 'boolean') {
        // Multiple choice or boolean - check if selected option is correct
        const correctOption = questionOptions.find((o: any) => o.is_correct)
        if (correctOption && studentAnswer.selected_option_id === correctOption.id) {
          totalScore += question.points
          correctCount++
        }
      }
      // Short answer questions: manual grading required (score = 0 for now)
    }

    // Count security violations
    const { data: violations, error: violationsError } = await supabaseAdmin
      .from('security_logs')
      .select('id')
      .eq('session_id', session_id)

    const violationCount = violations?.length || 0

    // Determine final status
    let finalStatus: 'submitted' | 'flagged' = 'submitted'
    
    // Flag if violations exceed threshold based on strictness
    const quizSettings = quiz.settings as any
    const strictness = quizSettings?.strictness || 'medium'
    const violationThreshold = strictness === 'high' ? 3 : strictness === 'medium' ? 5 : 7
    
    if (violationCount >= violationThreshold) {
      finalStatus = 'flagged'
    }

    // Update exam session with calculated score
    const { error: updateError } = await supabaseAdmin
      .from('exam_sessions')
      .update({
        status: finalStatus,
        score: totalScore,
        completed_at: new Date().toISOString()
      })
      .eq('id', session_id)

    if (updateError) {
      console.error('Failed to update session:', updateError)
      return NextResponse.json(
        { error: 'Failed to submit exam' },
        { status: 500 }
      )
    }

    // Return success (DO NOT return score to prevent client-side tampering)
    return NextResponse.json({
      success: true,
      status: finalStatus,
      violation_count: violationCount,
      message: finalStatus === 'flagged' 
        ? 'Exam submitted but flagged for review due to security violations'
        : 'Exam submitted successfully'
    })

  } catch (error: any) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
