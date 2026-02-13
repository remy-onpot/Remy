// app/app/dashboard/quiz/[id]/grading/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, CheckCircle, Brain, Save, Loader2 } from 'lucide-react'

// Dummy type for the UI state
type PendingGrade = {
  session_id: string;
  question_id: string;
  student_name: string;
  index_number: string;
  question_content: string;
  sample_answer: string;
  max_points: number;
  student_response: string;
  ai_score?: number;
  ai_feedback?: string;
  lecturer_score?: number;
}

export default function GradingPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<PendingGrade[]>([])
  const [activeProcessingId, setActiveProcessingId] = useState<string | null>(null)

  useEffect(() => {
    // In a real app, you'd fetch this from a specialized API route or Supabase query
    // that joins 'answers', 'questions', and 'exam_sessions' where is_graded = false
    // and question.type IN ('long_answer', 'short_answer', 'comprehension')
    
    // Simulating the fetch for UI demonstration
    setTimeout(() => {
      setAnswers([
        {
          session_id: 's1', question_id: 'q1',
          student_name: 'Kwame Mensah', index_number: '10293847',
          question_content: 'Define Market Segmentation.',
          sample_answer: 'Dividing a broad target market into subsets of consumers who have common needs.',
          max_points: 5,
          student_response: 'It is when you break the market into smaller groups based on what people like to buy.',
        }
      ])
      setLoading(false)
    }, 1000)
  }, [quizId])

  const requestAiGrade = async (index: number) => {
    const answer = answers[index];
    setActiveProcessingId(answer.question_id + answer.session_id);
    
    try {
      const res = await fetch('/api/quiz/grade/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: answer.session_id,
          questionId: answer.question_id,
          questionContent: answer.question_content,
          studentAnswer: answer.student_response,
          sampleAnswer: answer.sample_answer,
          maxPoints: answer.max_points
        })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const updated = [...answers];
      updated[index].ai_score = data.score;
      updated[index].ai_feedback = data.feedback;
      updated[index].lecturer_score = data.score; // Pre-fill with AI score
      setAnswers(updated);
      
    } catch (error: any) {
      console.error(error);
      // You can add a toast error here
    } finally {
      setActiveProcessingId(null);
    }
  }

  const handleScoreChange = (index: number, val: string) => {
    const updated = [...answers];
    updated[index].lecturer_score = Number(val);
    setAnswers(updated);
  }

  const saveGrade = async (index: number) => {
    const answer = answers[index];
    
    try {
      const res = await fetch('/api/quiz/grade/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: answer.session_id,
          questionId: answer.question_id,
          lecturerScore: answer.lecturer_score
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      // Remove from the "Pending" list locally
      setAnswers(answers.filter((_, i) => i !== index));
      
    } catch (error: any) {
      console.error(error);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading pending grades...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/dashboard/quiz/${quizId}/analytics`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Analytics
          </Link>
          <h1 className="font-semibold">Subjective Grading Center</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        
        {answers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">All caught up!</h2>
            <p className="text-muted-foreground">There are no pending subjective answers to grade.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">{answers.length} answers pending your review.</p>
            </div>

            {answers.map((ans, index) => (
              <Card key={ans.session_id + ans.question_id} className="overflow-hidden border-indigo-100">
                {/* Student Info Header */}
                <div className="bg-slate-100 px-6 py-3 border-b flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{ans.student_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({ans.index_number})</span>
                  </div>
                  <div className="font-semibold text-indigo-700">Max Points: {ans.max_points}</div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Q & A Section */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Question</Label>
                        <p className="font-medium mt-1">{ans.question_content}</p>
                      </div>
                      <div className="bg-green-50/50 p-3 rounded-md border border-green-100">
                        <Label className="text-green-800 text-xs uppercase tracking-wider">Answer Key / Rubric</Label>
                        <p className="text-sm mt-1">{ans.sample_answer}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground">Student's Response</Label>
                      <div className="bg-white p-4 rounded-md border mt-1 shadow-inner min-h-[100px]">
                        {ans.student_response}
                      </div>
                    </div>
                  </div>

                  {/* Grading Section */}
                  <div className="border-t pt-6 bg-slate-50/50 -mx-6 -mb-6 p-6">
                    {!ans.ai_score ? (
                      <Button 
                        onClick={() => requestAiGrade(index)} 
                        variant="secondary" 
                        className="w-full gap-2 border-indigo-200 hover:bg-indigo-50"
                        disabled={activeProcessingId === (ans.question_id + ans.session_id)}
                      >
                        {activeProcessingId === (ans.question_id + ans.session_id) ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> AI is grading...</>
                        ) : (
                          <><Brain className="h-4 w-4 text-indigo-600" /> Ask AI to suggest a grade</>
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Alert className="bg-indigo-50 border-indigo-200">
                          <Brain className="h-4 w-4 text-indigo-600" />
                          <AlertDescription className="text-indigo-900 ml-2">
                            <strong>AI Feedback:</strong> {ans.ai_feedback}
                          </AlertDescription>
                        </Alert>
                        
                        <div className="flex items-end gap-4">
                          <div className="space-y-2">
                            <Label>Final Score</Label>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                className="w-24 text-lg font-bold" 
                                value={ans.lecturer_score || ''} 
                                onChange={(e) => handleScoreChange(index, e.target.value)}
                                max={ans.max_points}
                                min={0}
                                step={0.5}
                              />
                              <span className="text-muted-foreground">/ {ans.max_points}</span>
                            </div>
                          </div>
                          
                          <Button onClick={() => saveGrade(index)} className="gap-2 bg-green-600 hover:bg-green-700">
                            <Save className="h-4 w-4" /> Approve & Save
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}