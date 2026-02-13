'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Home,
  Download,
  Loader2
} from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { ExamSession, Question, QuizSettings } from '@/types'

interface ResultsPageProps {
  params: Promise<{ id: string }>
}

interface QuestionResult {
  question: Question
  studentAnswer: string | null
  correctAnswer: string | null
  isCorrect: boolean
  pointsEarned: number
  pointsPossible: number
}

export default function ExamResultsPage({ params }: ResultsPageProps) {
  const { id: sessionId } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<ExamSession | null>(null)
  const [results, setResults] = useState<QuestionResult[]>([])
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [securityLogs, setSecurityLogs] = useState<any[]>([])

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      // Fetch session with quiz details
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('exam_sessions')
        .select('*, quiz:quizzes(*)')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        setError('Session not found')
        return
      }

      // Access control: Check if session is submitted
      if (sessionData.status !== 'submitted' && sessionData.status !== 'flagged') {
        setError('Results are only available for submitted exams')
        router.push('/exam')
        return
      }

      const quiz = sessionData.quiz as any
      const settings = quiz.settings as QuizSettings

      // Access control: Check if quiz has ended (if required by settings)
      if (settings.results_after_quiz_end_only !== false && quiz.status !== 'ended') {
        setError('Results will be available when the quiz ends')
        return
      }

      setSession(sessionData as any)
      setQuizSettings(settings)

      // Fetch questions with options
      const { data: questions, error: questionsError } = await supabaseClient
        .from('questions')
        .select('*')
        .eq('quiz_id', sessionData.quiz_id)
        .order('position')

      if (questionsError) throw questionsError

      // Fetch all options
      const { data: options, error: optionsError } = await supabaseClient
        .from('options')
        .select('*')

      if (optionsError) throw optionsError

      // Map options to questions
      const questionsWithOptions = questions.map(q => ({
        ...q,
        options: options?.filter(o => o.question_id === q.id) || []
      }))

      // Fetch student answers
      const { data: answers, error: answersError } = await supabaseClient
        .from('answers')
        .select('*')
        .eq('session_id', sessionId)

      if (answersError) throw answersError

      // Fetch security logs
      const { data: logs, error: logsError } = await supabaseClient
        .from('security_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('occurred_at', { ascending: false })

      if (!logsError && logs) {
        setSecurityLogs(logs)
      }

      // Build results array
      const resultsArray: QuestionResult[] = []
      const answerMap = new Map(answers?.map(a => [a.question_id, a]) || [])

      for (const question of questionsWithOptions) {
        const studentAnswerData = answerMap.get(question.id)
        let studentAnswer: string | null = null
        let correctAnswer: string | null = null
        let isCorrect = false
        let pointsEarned = 0

        if (question.type === 'mcq' || question.type === 'boolean') {
          const correctOption = question.options.find((o: any) => o.is_correct)
          correctAnswer = correctOption?.content || null

          if (studentAnswerData?.selected_option_id) {
            const selectedOption = question.options.find((o: any) => o.id === studentAnswerData.selected_option_id)
            studentAnswer = selectedOption?.content || null
            isCorrect = selectedOption?.is_correct || false
            if (isCorrect) {
              pointsEarned = question.points
            }
          }
        } else if (question.type === 'short_answer') {
          studentAnswer = studentAnswerData?.text_response || null
          // Short answer needs manual grading
          correctAnswer = 'Requires manual grading'
        }

        resultsArray.push({
          question: question as Question,
          studentAnswer,
          correctAnswer,
          isCorrect,
          pointsEarned,
          pointsPossible: question.points
        })
      }

      setResults(resultsArray)

    } catch (err: any) {
      console.error('Error loading results:', err)
      setError('Failed to load exam results')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/exam/results/${sessionId}/pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exam-results-${sessionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF download error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F172A]" strokeWidth={1.5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <Card className="max-w-md border-[#E2E8F0]">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Results</CardTitle>
            <CardDescription className="text-slate-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="bg-[#0F172A] hover:bg-[#1F2937] text-white gap-2">
                <Home className="h-4 w-4" strokeWidth={1.5} />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session || !results.length) return null

  const totalPoints = results.reduce((sum, r) => sum + r.pointsPossible, 0)
  const earnedPoints = results.reduce((sum, r) => sum + r.pointsEarned, 0)
  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const correctCount = results.filter(r => r.isCorrect).length
  const wrongCount = results.filter(r => !r.isCorrect && r.studentAnswer !== null).length
  const unansweredCount = results.filter(r => r.studentAnswer === null).length

  const passingScore = quizSettings?.passing_score
  const hasPassed = passingScore ? percentage >= passingScore : null

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

  const showCorrectAnswers = quizSettings?.show_correct_answers !== false

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-bold text-lg text-[#0F172A]">Assessment Results</h1>
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadPDF} 
              variant="outline"
              className="border-[#E2E8F0] text-[#0F172A] gap-2"
            >
              <Download className="h-4 w-4" strokeWidth={1.5} />
              Download PDF
            </Button>
            <Link href="/">
              <Button className="bg-[#0F172A] hover:bg-[#1F2937] text-white gap-2">
                <Home className="h-4 w-4" strokeWidth={1.5} />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Score Card */}
        <Card className="mb-8 border-2 border-[#E2E8F0] shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                hasPassed === true ? 'bg-emerald-100' :
                hasPassed === false ? 'bg-red-100' :
                'bg-blue-100'
              }`}>
                {hasPassed === true ? (
                  <Trophy className="h-16 w-16 text-[#10B981]" strokeWidth={1.5} />
                ) : hasPassed === false ? (
                  <XCircle className="h-16 w-16 text-red-600" strokeWidth={1.5} />
                ) : (
                  <Trophy className="h-16 w-16 text-blue-600" strokeWidth={1.5} />
                )}
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-[#0F172A]">Score: {percentage}%</CardTitle>
            <CardDescription className="text-xl text-slate-600">{earnedPoints} / {totalPoints} points</CardDescription>
            
            {hasPassed !== null && (
              <div className="mt-2 inline-flex mx-auto">
                <div className={`px-4 py-2 rounded-lg font-semibold text-white ${
                  hasPassed ? 'bg-[#10B981]' : 'bg-red-600'
                }`}>
                  {hasPassed ? '✓ Passed' : '✗ Did Not Pass'} (Passing: {passingScore}%)
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg border border-[#E2E8F0]">
                <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-2xl font-bold text-[#0F172A]">{correctCount}</p>
                <p className="text-sm text-slate-600">Correct</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-[#E2E8F0]">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-2xl font-bold text-[#0F172A]">{wrongCount}</p>
                <p className="text-sm text-slate-600">Incorrect</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg border border-[#E2E8F0]">
                <AlertTriangle className="h-8 w-8 text-slate-500 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-2xl font-bold text-[#0F172A]">{unansweredCount}</p>
                <p className="text-sm text-slate-600">Unanswered</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-[#E2E8F0]">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-2xl font-bold text-[#0F172A]">{timeTaken ? formatTime(timeTaken) : 'N/A'}</p>
                <p className="text-sm text-slate-600">Time Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Summary */}
        {securityLogs.length > 0 && (
          <Alert className="mb-8 border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" strokeWidth={1.5} />
            <AlertDescription className="text-red-800 ml-2">
              <p className="font-bold">⚠️ Security Violations Detected: {securityLogs.length}</p>
              <ul className="mt-2 text-sm space-y-1">
                {securityLogs.slice(0, 5).map((log, i) => (
                  <li key={i}>
                    • {log.event_type.replace('_', ' ')} at {new Date(log.occurred_at).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
              {session.status === 'flagged' && (
                <p className="mt-2 text-sm font-semibold">This assessment has been flagged for institutional review.</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Question Breakdown */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#0F172A]">Question Breakdown</h2>
          
          {results.map((result, index) => {
            const { question, studentAnswer, correctAnswer, isCorrect, pointsEarned, pointsPossible } = result

            return (
              <Card key={question.id} className={`border-2 shadow-sm ${
                isCorrect ? 'border-[#10B981] bg-emerald-50' : 
                studentAnswer === null ? 'border-slate-300 bg-slate-50' :
                'border-red-300 bg-red-50'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`px-3 py-1 rounded font-bold text-white text-xs ${
                          isCorrect ? 'bg-[#10B981]' : studentAnswer === null ? 'bg-slate-500' : 'bg-red-600'
                        }`}>
                          Q{index + 1}
                        </div>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-[#10B981] font-semibold">
                            <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                            Correct
                          </span>
                        ) : studentAnswer === null ? (
                          <span className="flex items-center gap-1 text-slate-600 font-semibold">
                            <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                            Not Answered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-semibold">
                            <XCircle className="h-5 w-5" strokeWidth={1.5} />
                            Incorrect
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg text-[#0F172A]">{question.content}</CardTitle>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600 font-medium">Points</p>
                      <p className="text-2xl font-bold">
                        <span className={isCorrect ? 'text-[#10B981]' : 'text-red-600'}>
                          {pointsEarned}
                        </span>
                        <span className="text-slate-400 text-lg"> / {pointsPossible}</span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {question.type === 'mcq' || question.type === 'boolean' ? (
                    <div className="space-y-2">
                      {question.options?.map((option: any) => {
                        const isStudentAnswer = studentAnswer === option.content
                        const isCorrectAnswer = showCorrectAnswers && option.is_correct

                        return (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrectAnswer && isStudentAnswer ? 'bg-emerald-100 border-[#10B981]' :
                              isCorrectAnswer ? 'bg-emerald-50 border-[#10B981]' :
                              isStudentAnswer ? 'bg-red-100 border-red-500' :
                              'border-[#E2E8F0] bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[#0F172A]">{option.content}</span>
                              <div className="flex items-center gap-2">
                                {isStudentAnswer && (
                                  <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                    isCorrectAnswer ? 'bg-[#10B981] text-white' : 'bg-red-600 text-white'
                                  }`}>
                                    Your Answer
                                  </div>
                                )}
                                {isCorrectAnswer && showCorrectAnswers && (
                                  <CheckCircle2 className="h-5 w-5 text-[#10B981]" strokeWidth={1.5} />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-lg border border-[#E2E8F0]">
                        <p className="text-sm font-semibold text-[#0F172A] mb-1">Your Response:</p>
                        <p className="text-sm text-slate-700">{studentAnswer || '(No response provided)'}</p>
                      </div>
                      {showCorrectAnswers && correctAnswer && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Note:</p>
                          <p className="text-sm text-blue-800">{correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Button 
            onClick={handleDownloadPDF} 
            className="bg-[#0F172A] hover:bg-[#1F2937] text-white gap-2"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
            Download Results PDF
          </Button>
          <Link href="/">
            <Button 
              variant="outline" 
              className="border-[#E2E8F0] text-[#0F172A] gap-2"
            >
              <Home className="h-4 w-4" strokeWidth={1.5} />
              Return Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
