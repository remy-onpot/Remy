'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  CheckCircle2, 
  SkipForward, 
  Circle,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { ExamSession, Question } from '@/types'

interface ReviewPageProps {
  params: Promise<{ id: string }>
}

export default function ExamReviewPage({ params }: ReviewPageProps) {
  const { id: sessionId } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<ExamSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReviewData()
  }, [])

  const loadReviewData = async () => {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('exam_sessions')
        .select('*, quiz:quizzes(*)')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      
      // Check if session is still in progress
      if (sessionData.status !== 'in_progress') {
        router.push('/exam/completed')
        return
      }

      setSession(sessionData as any)

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabaseClient
        .from('questions')
        .select('*, options(*)')
        .eq('quiz_id', sessionData.quiz_id)
        .order('position')

      if (questionsError) throw questionsError
      setQuestions(questionsData as any)

      // Fetch answers
      const { data: answersData, error: answersError } = await supabaseClient
        .from('answers')
        .select('*')
        .eq('session_id', sessionId)

      if (answersError) throw answersError

      const answersMap: Record<string, string> = {}
      answersData?.forEach((answer) => {
        if (answer.selected_option_id) {
          answersMap[answer.question_id] = answer.selected_option_id
        } else if (answer.text_response) {
          answersMap[answer.question_id] = answer.text_response
        }
      })
      setAnswers(answersMap)

    } catch (error) {
      console.error('Error loading review data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length
  const skippedCount = questions.filter(q => !answers[q.id]).length
  const progress = (answeredCount / questions.length) * 100

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/exam/session/${sessionId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Exam
            </Button>
            <h1 className="font-semibold">Review Your Answers</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{answeredCount}</p>
                  <p className="text-sm text-muted-foreground">Answered</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Circle className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{skippedCount}</p>
                  <p className="text-sm text-muted-foreground">Unanswered</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {Math.round(progress)}%
                </div>
                <div>
                  <p className="text-2xl font-bold">{answeredCount}/{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
            </div>

            {skippedCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">You have {skippedCount} unanswered question{skippedCount !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Remember to answer all questions before submitting to maximize your score.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions Review */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const answer = answers[question.id]
            const isAnswered = !!answer

            return (
              <Card key={question.id} className={!isAnswered ? 'border-amber-300' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={isAnswered ? 'default' : 'secondary'} className={
                          isAnswered ? 'bg-green-500' : 'bg-amber-500'
                        }>
                          Question {index + 1}
                        </Badge>
                        {isAnswered ? (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Answered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-amber-600">
                            <Circle className="h-4 w-4" />
                            Not Answered
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg">{question.content}</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        router.push(`/exam/session/${sessionId}`)
                        // The exam page will need to handle scrolling to this question
                      }}
                    >
                      Jump to Question
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {question.type === 'mcq' && (
                    <div className="space-y-2">
                      {question.options?.map((option) => {
                        const isSelected = answer === option.id
                        return (
                          <div
                            key={option.id}
                            className={`p-3 border-2 rounded-lg ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                              <span className={isSelected ? 'font-medium' : ''}>
                                {option.content}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {!isAnswered && (
                        <p className="text-sm text-amber-600 mt-2">No option selected</p>
                      )}
                    </div>
                  )}

                  {question.type === 'short_answer' && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      {answer ? (
                        <p className="text-sm">{answer}</p>
                      ) : (
                        <p className="text-sm text-amber-600">No answer provided</p>
                      )}
                    </div>
                  )}

                  {question.type === 'boolean' && (
                    <div className="space-y-2">
                      {question.options?.map((option) => {
                        const isSelected = answer === option.id
                        return (
                          <div
                            key={option.id}
                            className={`p-3 border-2 rounded-lg ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                              <span className={isSelected ? 'font-medium' : ''}>
                                {option.content}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {!isAnswered && (
                        <p className="text-sm text-amber-600 mt-2">No answer selected</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={() => router.push(`/exam/session/${sessionId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Exam
          </Button>
        </div>
      </main>
    </div>
  )
}
