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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F172A]" strokeWidth={1.5} />
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length
  const skippedCount = questions.filter(q => !answers[q.id]).length
  const progress = (answeredCount / questions.length) * 100

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/exam/session/${sessionId}`)}
              className="border-[#E2E8F0] text-[#0F172A] gap-2"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Resume Exam
            </Button>
            <h1 className="font-bold text-lg text-[#0F172A]">Review Responses</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Progress Summary */}
        <Card className="mb-6 border-[#E2E8F0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#0F172A]">Response Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-[#E2E8F0]">
                <CheckCircle2 className="h-8 w-8 text-[#10B981]" strokeWidth={1.5} />
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{answeredCount}</p>
                  <p className="text-sm text-slate-600">Answered</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-[#E2E8F0]">
                <Circle className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{skippedCount}</p>
                  <p className="text-sm text-slate-600">Unanswered</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-[#E2E8F0]">
                <div className="h-8 w-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white font-bold text-sm">
                  {Math.round(progress)}%
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{answeredCount}/{questions.length}</p>
                  <p className="text-sm text-slate-600">Progress</p>
                </div>
              </div>
            </div>

            {skippedCount > 0 && (
              <div className="bg-amber-50 border border-[#F59E0B] rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-[#F59E0B] mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="font-semibold text-[#0F172A]">{skippedCount} Unanswered Question{skippedCount !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Answer all questions before submitting to receive maximum points.
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
              <Card key={question.id} className={`border-2 shadow-sm ${
                isAnswered ? 'border-[#E2E8F0] bg-white' : 'border-[#F59E0B] bg-amber-50'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`px-3 py-1 rounded font-bold text-white text-xs ${
                          isAnswered ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                        }`}>
                          Q{index + 1}
                        </div>
                        {isAnswered ? (
                          <span className="flex items-center gap-1 text-sm text-[#10B981] font-semibold">
                            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                            Answered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-[#F59E0B] font-semibold">
                            <Circle className="h-4 w-4" strokeWidth={1.5} />
                            Not Answered
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg text-[#0F172A]">{question.content}</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        router.push(`/exam/session/${sessionId}`)
                      }}
                      className="border-[#E2E8F0] text-[#0F172A]"
                    >
                      Jump to Q{index + 1}
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
                                ? 'border-[#10B981] bg-emerald-50'
                                : 'border-[#E2E8F0] bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />}
                              <span className={`${isSelected ? 'font-semibold text-[#0F172A]' : 'text-slate-700'}`}>
                                {option.content}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {!isAnswered && (
                        <p className="text-sm text-[#F59E0B] font-medium mt-2">No option selected</p>
                      )}
                    </div>
                  )}

                  {question.type === 'short_answer' && (
                    <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-lg">
                      {answer ? (
                        <p className="text-sm text-slate-700">{answer}</p>
                      ) : (
                        <p className="text-sm text-[#F59E0B] font-medium">No response provided</p>
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
                                ? 'border-[#10B981] bg-emerald-50'
                                : 'border-[#E2E8F0] bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />}
                              <span className={`${isSelected ? 'font-semibold text-[#0F172A]' : 'text-slate-700'}`}>
                                {option.content}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {!isAnswered && (
                        <p className="text-sm text-[#F59E0B] font-medium mt-2">No answer selected</p>
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
            className="bg-[#10B981] hover:bg-[#059669] text-white gap-2"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Return to Exam
          </Button>
        </div>
      </main>
    </div>
  )
}
