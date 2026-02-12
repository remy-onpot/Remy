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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>
                <Home className="h-4 w-4 mr-2" />
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-semibold">Exam Results</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Score Card */}
        <Card className="mb-8 border-2">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                hasPassed === true ? 'bg-green-100' :
                hasPassed === false ? 'bg-red-100' :
                'bg-blue-100'
              }`}>
                {hasPassed === true ? (
                  <Trophy className="h-16 w-16 text-green-600" />
                ) : hasPassed === false ? (
                  <XCircle className="h-16 w-16 text-red-600" />
                ) : (
                  <Trophy className="h-16 w-16 text-blue-600" />
                )}
              </div>
            </div>
            <CardTitle className="text-3xl">Your Score: {percentage}%</CardTitle>
            <CardDescription className="text-lg">{earnedPoints} / {totalPoints} points</CardDescription>
            
            {hasPassed !== null && (
              <Badge 
                variant={hasPassed ? 'default' : 'destructive'}
                className="mt-2"
              >
                {hasPassed ? '✓ Passed' : '✗ Failed'} (Passing: {passingScore}%)
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                <p className="text-sm text-green-600">Correct</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700">{wrongCount}</p>
                <p className="text-sm text-red-600">Wrong</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-700">{unansweredCount}</p>
                <p className="text-sm text-gray-600">Unanswered</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{timeTaken ? formatTime(timeTaken) : 'N/A'}</p>
                <p className="text-sm text-blue-600">Time Taken</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Summary */}
        {securityLogs.length > 0 && (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Security Violations: {securityLogs.length} incident{securityLogs.length !== 1 ? 's' : ''}</p>
              <ul className="mt-2 text-sm space-y-1">
                {securityLogs.slice(0, 5).map((log, i) => (
                  <li key={i}>
                    • {log.event_type.replace('_', ' ')} at {new Date(log.occurred_at).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
              {session.status === 'flagged' && (
                <p className="mt-2 text-sm font-medium">⚠️ This exam has been flagged for review due to multiple violations.</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Question Breakdown */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Question Breakdown</h2>
          
          {results.map((result, index) => {
            const { question, studentAnswer, correctAnswer, isCorrect, pointsEarned, pointsPossible } = result

            return (
              <Card key={question.id} className={`${
                isCorrect ? 'border-green-300' : 
                studentAnswer === null ? 'border-gray-300' :
                'border-red-300'
              } border-2`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={isCorrect ? 'default' : 'secondary'} className={
                          isCorrect ? 'bg-green-500' : studentAnswer === null ? 'bg-gray-500' : 'bg-red-500'
                        }>
                          Question {index + 1}
                        </Badge>
                        {isCorrect ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle2 className="h-5 w-5" />
                            Correct
                          </span>
                        ) : studentAnswer === null ? (
                          <span className="flex items-center gap-1 text-gray-600 font-medium">
                            <AlertTriangle className="h-5 w-5" />
                            Not Answered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <XCircle className="h-5 w-5" />
                            Wrong
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg">{question.content}</CardTitle>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Points</p>
                      <p className="text-xl font-bold">
                        <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                          {pointsEarned}
                        </span>
                        <span className="text-gray-400"> / {pointsPossible}</span>
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
                              isCorrectAnswer && isStudentAnswer ? 'bg-green-50 border-green-500' :
                              isCorrectAnswer ? 'bg-green-50 border-green-400' :
                              isStudentAnswer ? 'bg-red-50 border-red-500' :
                              'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{option.content}</span>
                              <div className="flex items-center gap-2">
                                {isStudentAnswer && (
                                  <Badge variant={isCorrectAnswer ? 'default' : 'destructive'} className="text-xs">
                                    Your Answer
                                  </Badge>
                                )}
                                {isCorrectAnswer && showCorrectAnswers && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Your Answer:</p>
                        <p className="text-sm">{studentAnswer || 'No answer provided'}</p>
                      </div>
                      {showCorrectAnswers && correctAnswer && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-600 mb-1">Note:</p>
                          <p className="text-sm">{correctAnswer}</p>
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
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download Results PDF
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
