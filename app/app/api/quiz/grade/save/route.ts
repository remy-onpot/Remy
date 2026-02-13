import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId, questionId, lecturerScore } = await req.json()

    if (!sessionId || !questionId || lecturerScore === undefined) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 1. Update the individual answer
    const { error: answerError } = await supabaseClient
      .from('answers')
      .update({
        lecturer_score: Number(lecturerScore),
        is_graded: true
      })
      .eq('session_id', sessionId)
      .eq('question_id', questionId)

    if (answerError) throw answerError

    // 2. Recalculate the Total Score for this Exam Session
    // We need to sum up all MCQ correct answers + all manually graded subjective answers
    
    // First, fetch all answers for this session
    const { data: allAnswers, error: fetchError } = await supabaseClient
      .from('answers')
      .select('lecturer_score, selected_option_id, question_id')
      .eq('session_id', sessionId)

    if (fetchError) throw fetchError

    // Fetch the correct options and points for this quiz to calculate the auto-grade
    const { data: questions } = await supabaseClient
      .from('questions')
      .select('id, points, options(id, is_correct)')
      .in('id', allAnswers.map(a => a.question_id))

    let newTotalScore = 0

    allAnswers.forEach(ans => {
      if (ans.lecturer_score !== null && ans.lecturer_score !== undefined) {
        // It's a graded subjective question
        newTotalScore += Number(ans.lecturer_score)
      } else if (ans.selected_option_id) {
        // It's an auto-graded MCQ
        const question = questions?.find(q => q.id === ans.question_id)
        const isCorrect = question?.options?.some(opt => opt.id === ans.selected_option_id && opt.is_correct)
        if (isCorrect) {
          newTotalScore += (question?.points || 0)
        }
      }
    })

    // 3. Update the exam_session with the new total score
    const { error: sessionError } = await supabaseClient
      .from('exam_sessions')
      .update({ score: newTotalScore })
      .eq('id', sessionId)

    if (sessionError) throw sessionError

    return NextResponse.json({ success: true, newTotalScore }, { status: 200 })

  } catch (error: any) {
    console.error('Save Grade Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to save grade' }, { status: 500 })
  }
}