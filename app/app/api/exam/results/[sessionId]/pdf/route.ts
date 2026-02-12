import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { jsPDF } from 'jspdf'

// Server-side Supabase client
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const resolvedParams = await params
    const sessionId = resolvedParams.sessionId

    // Fetch session with quiz
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only allow PDF for submitted exams
    if (session.status !== 'submitted' && session.status !== 'flagged') {
      return NextResponse.json({ error: 'Results not available' }, { status: 403 })
    }

    // Fetch quiz
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', session.quiz_id)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Fetch student name from roster
    const { data: rosterEntry } = await supabaseAdmin
      .from('roster')
      .select('student_name')
      .eq('quiz_id', session.quiz_id)
      .eq('index_number', session.index_number)
      .single()

    const studentName = rosterEntry?.student_name || 'Unknown Student'

    // Calculate time taken
    const timeTaken = session.completed_at && session.started_at
      ? Math.floor((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)
      : null

    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      if (hours > 0) return `${hours}h ${mins}m ${secs}s`
      if (mins > 0) return `${mins}m ${secs}s`
      return `${secs}s`
    }

    // Create PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPosition = 20

    // Header
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Exam Results', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.text('NimdeQuiz App', pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Horizontal line
    doc.setDrawColor(200, 200, 200)
    doc.line(20, yPosition, pageWidth - 20, yPosition)
    yPosition += 15

    // Exam Information
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Exam Information', 20, yPosition)
    yPosition += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Exam Name: ${quiz.title}`, 20, yPosition)
    yPosition += 6
    doc.text(`Exam Code: ${quiz.code}`, 20, yPosition)
    yPosition += 6
    doc.text(`Student Name: ${studentName}`, 20, yPosition)
    yPosition += 6
    doc.text(`Index Number: ${session.index_number}`, 20, yPosition)
    yPosition += 6
    doc.text(`Date: ${new Date(session.completed_at || session.started_at).toLocaleDateString()}`, 20, yPosition)
    yPosition += 6
    doc.text(`Time Taken: ${timeTaken ? formatTime(timeTaken) : 'N/A'}`, 20, yPosition)
    yPosition += 15

    // Score Summary
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Score Summary', 20, yPosition)
    yPosition += 8

    // Score box
    const score = session.score || 0
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(20, yPosition, pageWidth - 40, 25, 3, 3, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(0, 102, 204)
    doc.text(`${score} points`, pageWidth / 2, yPosition + 12, { align: 'center' })
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const quizSettings = quiz.settings as any
    const passingScore = quizSettings?.passing_score
    if (passingScore) {
      doc.text(`Passing Score: ${passingScore}`, pageWidth / 2, yPosition + 20, { align: 'center' })
    }
    yPosition += 35

    // Status
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('Status:', 20, yPosition)
    if (session.status === 'flagged') {
      doc.setTextColor(255, 0, 0)
      doc.text('FLAGGED FOR REVIEW', 45, yPosition)
    } else {
      doc.setTextColor(0, 150, 0)
      doc.text('SUBMITTED', 45, yPosition)
    }
    yPosition += 15

    // ── Fetch questions, options, and answers ──
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('quiz_id', session.quiz_id)
      .order('position')

    const { data: allOptions } = await supabaseAdmin
      .from('options')
      .select('*')

    const { data: answers } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('session_id', sessionId)

    if (questions && questions.length > 0) {
      const optionsByQuestion = new Map<string, any[]>()
      allOptions?.forEach(opt => {
        const list = optionsByQuestion.get(opt.question_id) || []
        list.push(opt)
        optionsByQuestion.set(opt.question_id, list)
      })

      const answerMap = new Map(answers?.map(a => [a.question_id, a]) || [])

      // Question-by-question results
      doc.setDrawColor(200, 200, 200)
      doc.line(20, yPosition, pageWidth - 20, yPosition)
      yPosition += 10

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text('Question Results', 20, yPosition)
      yPosition += 10

      let totalEarned = 0
      let totalPossible = 0

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const qOptions = optionsByQuestion.get(q.id) || []
        const studentAnswer = answerMap.get(q.id)

        // Check if we need a new page
        if (yPosition > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage()
          yPosition = 20
        }

        const correctOption = qOptions.find((o: any) => o.is_correct)
        let studentAnswerText = 'Not answered'
        let isCorrect = false

        if (q.type === 'mcq' || q.type === 'boolean') {
          if (studentAnswer?.selected_option_id) {
            const selected = qOptions.find((o: any) => o.id === studentAnswer.selected_option_id)
            studentAnswerText = selected?.content || 'Unknown option'
            isCorrect = selected?.is_correct || false
          }
        } else if (q.type === 'short_answer') {
          studentAnswerText = studentAnswer?.text_response || 'Not answered'
        }

        const pointsEarned = isCorrect ? (q.points || 1) : 0
        totalEarned += pointsEarned
        totalPossible += (q.points || 1)

        // Question number and status icon
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)

        const statusIcon = studentAnswerText === 'Not answered' ? '○' : isCorrect ? '✓' : '✗'
        const statusColor: [number, number, number] = studentAnswerText === 'Not answered'
          ? [150, 150, 150]
          : isCorrect ? [0, 150, 0] : [220, 50, 50]

        doc.text(`Q${i + 1}.`, 20, yPosition)
        doc.setTextColor(...statusColor)
        doc.text(statusIcon, 32, yPosition)
        doc.setTextColor(0, 0, 0)

        // Question content (truncate if too long)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const questionText = (q.content || '').substring(0, 80) + ((q.content || '').length > 80 ? '...' : '')
        doc.text(questionText, 40, yPosition)
        yPosition += 5

        // Student answer
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        doc.text(`Your answer: ${studentAnswerText.substring(0, 70)}`, 40, yPosition)
        yPosition += 4

        // Correct answer
        if (correctOption && !isCorrect) {
          doc.setTextColor(0, 130, 0)
          doc.text(`Correct: ${(correctOption.content || '').substring(0, 70)}`, 40, yPosition)
          yPosition += 4
        }

        // Points
        doc.setTextColor(100, 100, 100)
        doc.text(`${pointsEarned}/${q.points || 1} pts`, pageWidth - 35, yPosition - (isCorrect ? 4 : 8), { align: 'right' })

        yPosition += 6
      }

      // Summary line
      if (yPosition > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        yPosition = 20
      }

      doc.setDrawColor(200, 200, 200)
      doc.line(20, yPosition, pageWidth - 20, yPosition)
      yPosition += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.text(`Total: ${totalEarned} / ${totalPossible} points`, 20, yPosition)

      const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0
      doc.text(`${percentage}%`, pageWidth - 25, yPosition, { align: 'right' })
      yPosition += 15
    }

    // Footer
    yPosition = doc.internal.pageSize.getHeight() - 20
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(128, 128, 128)
    doc.text('This is an official exam result generated by NimdeQuiz', pageWidth / 2, yPosition, { align: 'center' })
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition + 5, { align: 'center' })
    doc.text(`Session ID: ${sessionId}`, pageWidth / 2, yPosition + 10, { align: 'center' })

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="exam-results-${session.index_number}.pdf"`,
      },
    })

  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
