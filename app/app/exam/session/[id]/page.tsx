'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  WifiOff, 
  CheckCircle,
  Loader2,
  Maximize2,
  SkipForward,
  Eye,
  Circle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle
} from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { useIndexedDB } from '@/hooks/useIndexedDB'
import { ExamSession, Question, Answer, QuizSettings } from '@/types'
import { formatTimeRemaining, encryptProofString } from '@/lib/utils'
import { toast } from 'sonner'

interface ExamSessionPageProps {
  params: Promise<{ id: string }>
}

export default function ExamSessionPage({ params }: ExamSessionPageProps) {
  const { id: sessionId } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<ExamSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set())
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showSecurityWarning, setShowSecurityWarning] = useState(false)
  const [securityMessage, setSecurityMessage] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [proofString, setProofString] = useState('')
  const [showProofDialog, setShowProofDialog] = useState(false)

  // IndexedDB for offline storage
  const {
    saveAnswer,
    getUnsyncedAnswers,
    markAnswersSynced,
    saveSecurityEvent,
    getUnsyncedSecurityLogs,
    markSecurityLogsSynced,
    startOfflinePeriod,
    endOfflinePeriod,
    getUnsyncedOfflinePeriods,
  } = useIndexedDB(sessionId)

  // Load session data
  useEffect(() => {
    loadSessionData()
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      // Get session
      const { data: sessionData, error: sessionError } = await supabaseClient
        .from('exam_sessions')
        .select('*, quiz:quizzes(*)')
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        router.push('/exam')
        return
      }

      // Type assertion for joined data
      const typedSession = sessionData as any
      setSession(typedSession)

      // Get questions
      const { data: questionsData } = await supabaseClient
        .from('questions')
        .select('*, options(*)')
        .eq('quiz_id', typedSession.quiz_id)
        .order('position')

      if (questionsData) {
        setQuestions(questionsData as any)
      }

      // Calculate time remaining
      const settings = typedSession.quiz?.settings as QuizSettings | undefined
      const duration = settings?.duration ?? 60 // fallback to 60 minutes if settings missing
      const startTime = new Date(sessionData.started_at).getTime()
      const durationMs = duration * 60 * 1000
      const endTime = startTime + durationMs
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
      setTimeRemaining(remaining)

      // Load existing answers
      const { data: answersData } = await supabaseClient
        .from('answers')
        .select('*')
        .eq('session_id', sessionId)

      if (answersData) {
        const answersMap: Record<string, string> = {}
        answersData.forEach((a: any) => {
          answersMap[a.question_id] = a.selected_option_id || a.text_response || ''
        })
        setAnswers(answersMap)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading session:', error)
      router.push('/exam')
    }
  }

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  // Security monitor
  const handleStrike = useCallback((strikes: number) => {
    toast.error(`Security Strike ${strikes}/3!`, {
      description: 'Focus on your exam to avoid automatic submission.',
    })
  }, [])

  const handleWarning = useCallback((message: string) => {
    setSecurityMessage(message)
    setShowSecurityWarning(true)
    setTimeout(() => setShowSecurityWarning(false), 5000)
  }, [])

  const handleAutoSubmit = useCallback(async () => {
    await submitExam(true)
  }, [])

  const settings = session?.quiz?.settings as QuizSettings
  const { securityState, enterFullscreen } = useSecurityMonitor({
    sessionId,
    onStrike: handleStrike,
    onWarning: handleWarning,
    onAutoSubmit: handleAutoSubmit,
    strictness: settings?.strictness || 'medium',
  })

  // Heartbeat
  const { startHeartbeat, stopHeartbeat } = useHeartbeat({
    sessionId,
    onDisconnect: () => {
      setIsOffline(true)
      startOfflinePeriod()
      toast.warning('Connection lost', {
        description: 'Continuing in offline mode. Your answers are being saved locally.',
      })
    },
    onReconnect: async () => {
      setIsOffline(false)
      toast.success('Connection restored', {
        description: 'Syncing your answers...',
      })
      await syncOfflineData()
    },
    onSecurityWarning: (message, flagged) => {
      if (flagged) {
        toast.error('Security Alert', {
          description: message,
          duration: 10000,
        })
      } else {
        toast.warning('Security Notice', {
          description: message,
          duration: 5000,
        })
      }
    },
  })

  // Start heartbeat on mount
  useEffect(() => {
    startHeartbeat()
    return () => stopHeartbeat()
  }, [])

  // Real-time session monitoring for security enforcement
  useEffect(() => {
    if (!sessionId) return

    // Subscribe to session changes
    const channel = supabaseClient
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new as any
          
          // Check if session was flagged or terminated
          if (updatedSession.status === 'flagged' && session?.status !== 'flagged') {
            toast.error('Session Flagged', {
              description: 'Security violation detected. Your session has been flagged for review.',
              duration: 10000,
            })
            setSession(updatedSession)
          }
          
          if (updatedSession.status === 'terminated') {
            toast.error('Session Terminated', {
              description: 'Your session has been terminated due to security violations.',
              duration: Infinity,
            })
            // Force submission and logout
            setTimeout(() => {
              router.push('/exam/completed')
            }, 3000)
          }
          
          // Update strikes display
          if (updatedSession.strikes > (session?.strikes || 0)) {
            setSession(updatedSession)
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [sessionId, session?.status, session?.strikes])

  // Sync offline data
  const syncOfflineData = async () => {
    try {
      // Sync answers
      const unsyncedAnswers = await getUnsyncedAnswers()
      for (const answer of unsyncedAnswers) {
        await supabaseClient.from('answers').upsert({
          session_id: sessionId,
          question_id: answer.question_id,
          selected_option_id: answer.selected_option_id,
          text_response: answer.text_response,
        })
      }
      await markAnswersSynced(unsyncedAnswers.map((a) => a.question_id))

      // Sync security logs
      const unsyncedLogs = await getUnsyncedSecurityLogs()
      for (const log of unsyncedLogs) {
        await supabaseClient.from('security_logs').insert({
          session_id: sessionId,
          event_type: log.event_type,
          duration_seconds: log.duration_seconds,
          occurred_at: new Date(log.timestamp).toISOString(),
        })
      }
      await markSecurityLogsSynced(unsyncedLogs.map((l) => l.id))
    } catch (error) {
      console.error('Sync error:', error)
    }
  }

  // Handle answer change
  const handleAnswerChange = async (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    
    // Remove from skipped if previously skipped
    setSkippedQuestions((prev) => {
      const newSet = new Set(prev)
      newSet.delete(questionId)
      return newSet
    })

    // Save to IndexedDB
    const question = questions.find((q) => q.id === questionId)
    if (question?.type === 'mcq') {
      await saveAnswer({
        question_id: questionId,
        selected_option_id: value,
      })
    } else {
      await saveAnswer({
        question_id: questionId,
        text_response: value,
      })
    }

    // Try to sync immediately if online
    if (navigator.onLine) {
      try {
        await supabaseClient.from('answers').upsert({
          session_id: sessionId,
          question_id: questionId,
          selected_option_id: question?.type === 'mcq' ? value : null,
          text_response: question?.type !== 'mcq' ? value : null,
        })
      } catch (error) {
        console.error('Error saving answer:', error)
      }
    }
  }

  // Handle skip question
  const handleSkipQuestion = () => {
    const currentQ = questions[currentQuestion]
    
    // Mark as skipped if not answered
    if (!answers[currentQ.id]) {
      setSkippedQuestions((prev) => new Set(prev).add(currentQ.id))
    }
    
    // Move to next question
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    } else {
      // If on last question, show submit dialog
      setShowSubmitDialog(true)
    }
  }

  // Submit exam via secure API
  const submitExam = async (auto = false) => {
    if (submitting) return // Prevent double-tap on mobile
    setSubmitting(true)

    try {
      // Sync any remaining offline data (don't block submit on failure)
      try {
        await syncOfflineData()
      } catch (syncErr) {
        console.warn('Sync failed before submit, continuing:', syncErr)
      }

      // Call secure server-side grading API
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          device_fingerprint: session?.device_fingerprint,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit exam')
      }

      // Handle offline submission with proof
      if (!navigator.onLine) {
        const proof = encryptProofString(answers, Date.now(), sessionId)
        setProofString(proof)
        setShowProofDialog(true)
      } else {
        // Show appropriate message based on status
        if (result.status === 'flagged') {
          toast.warning(result.message)
        } else {
          toast.success(result.message)
        }
        
        router.push('/exam/completed')
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'Failed to submit exam')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F172A]" strokeWidth={1.5} />
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="exam-fullscreen bg-[#F8FAFC]">
      {/* Offline Banner - Per style guide */}
      {isOffline && (
        <div className="offline-banner flex items-center justify-center gap-2 bg-[#F59E0B] text-white">
          <WifiOff className="h-4 w-4" strokeWidth={1.5} />
          <span className="font-semibold">Connection Interrupted - Saving Locally</span>
        </div>
      )}

      {/* Security Warning */}
      {showSecurityWarning && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
          <Alert variant="destructive" className="shadow-lg bg-red-50 border-red-300 text-red-800">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            <AlertDescription className="text-red-700">{securityMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Header - Minimal per style guide: Timer, Progress, Navigation ONLY */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-6 w-6 text-[#0F172A]" strokeWidth={1.5} />
            <h1 className="font-semibold text-[#0F172A] text-lg">{session?.quiz?.title}</h1>
          </div>
          <div className="flex items-center gap-8">
            {/* Timer - Monospace per style guide */}
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-600" strokeWidth={1.5} />
              <span className={`exam-timer font-mono text-base font-bold tracking-wide ${
                timeRemaining < 300 ? 'text-[#F59E0B] animate-pulse' : 'text-[#0F172A]'
              }`}>
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
            {/* Integrity Indicators */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 uppercase">Integrity Status</span>
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i <= securityState.strikes ? 'bg-red-500' : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Progress</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-200" />
        </div>

        {/* Question */}
        {currentQ && (
          <Card className="mb-8 border-[#E2E8F0] shadow-sm">
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6">
                {currentQ.content}
              </h2>

              {currentQ.type === 'mcq' && currentQ.options && (
                <RadioGroup
                  value={answers[currentQ.id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="space-y-3"
                >
                  {currentQ.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-4 border border-[#E2E8F0] rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer text-slate-700">
                        {option.content}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQ.type === 'short_answer' && (
                <Textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  placeholder="Provide your response here..."
                  rows={6}
                  className="border-[#E2E8F0] focus:border-[#10B981]"
                />
              )}

              {currentQ.type === 'boolean' && (
                <RadioGroup
                  value={answers[currentQ.id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-4 border border-[#E2E8F0] rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer text-slate-700">True</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-[#E2E8F0] rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer text-slate-700">False</Label>
                  </div>
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="border-[#E2E8F0] text-[#0F172A] gap-2"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkipQuestion}
              className="border-[#E2E8F0] text-[#0F172A] gap-2"
            >
              <SkipForward className="h-4 w-4" strokeWidth={1.5} />
              Skip
            </Button>
            
            {currentQuestion < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
                className="bg-[#10B981] hover:bg-[#059669] text-white gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            ) : (
              <Button onClick={() => setShowSubmitDialog(true)} className="bg-[#10B981] hover:bg-[#059669] text-white gap-2">
                Submit Assessment
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="mt-8 pt-8 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#0F172A]">Question Navigation:</p>
            <div className="flex gap-6 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <SkipForward className="h-4 w-4 text-[#F59E0B]" strokeWidth={1.5} />
                <span>Skipped</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-slate-300" strokeWidth={1.5} />
                <span>Unanswered</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, i) => {
              const isAnswered = !!answers[q.id]
              const isSkipped = skippedQuestions.has(q.id)
              const isCurrent = currentQuestion === i
              
              return (
                <Button
                  key={q.id}
                  variant={isCurrent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-10 h-10 p-0 font-semibold ${
                    isCurrent 
                      ? 'bg-[#0F172A] text-white border-[#0F172A]' 
                      : isAnswered 
                      ? 'border-[#10B981] bg-emerald-50 text-[#0F172A]' 
                      : isSkipped 
                      ? 'border-[#F59E0B] bg-amber-50 text-[#0F172A]' 
                      : 'border-[#E2E8F0] text-[#0F172A]'
                  }`}
                >
                  {isAnswered ? (
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
                  ) : isSkipped ? (
                    <SkipForward className="h-4 w-4 text-[#F59E0B]" strokeWidth={1.5} />
                  ) : (
                    i + 1
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      </main>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="border-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#F59E0B]" strokeWidth={1.5} />
              Final Submission Confirmation
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4" asChild>
              <div className="text-sm text-slate-600 space-y-3">
                <p>You are about to submit your assessment. This action <span className="font-semibold text-[#0F172A]">cannot be undone</span>.</p>
                
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#0F172A]">
                      <CheckCircle2 className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
                      <span className="font-medium">Answered:</span>
                    </span>
                    <strong className="text-[#0F172A]">{Object.keys(answers).length} questions</strong>
                  </div>
                  
                  {skippedQuestions.size > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[#0F172A]">
                        <SkipForward className="h-4 w-4 text-[#F59E0B]" strokeWidth={1.5} />
                        <span className="font-medium">Skipped:</span>
                      </span>
                      <strong className="text-[#F59E0B]">
                        {skippedQuestions.size} questions
                        {skippedQuestions.size > 0 && (
                          <span className="text-xs ml-2 text-slate-600">
                            (Q{Array.from(skippedQuestions).map(qId => questions.findIndex(q => q.id === qId) + 1).join(', Q')})
                          </span>
                        )}
                      </strong>
                    </div>
                  )}
                  
                  {questions.length - Object.keys(answers).length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[#0F172A]">
                        <Circle className="h-4 w-4 text-slate-300" strokeWidth={1.5} />
                        <span className="font-medium">Unanswered:</span>
                      </span>
                      <strong className="text-red-600">
                        {questions.length - Object.keys(answers).length} questions
                      </strong>
                    </div>
                  )}
                </div>
                
                {(skippedQuestions.size > 0 || questions.length - Object.keys(answers).length > 0) && (
                  <p className="text-[#F59E0B] font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
                    Skipped and unanswered questions will receive zero points.
                  </p>
                )}
                
                <p className="text-slate-600 font-medium pt-2">
                  Are you ready to submit your assessment?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                setShowSubmitDialog(false)
                router.push(`/exam/session/${sessionId}/review`)
              }}
              className="border-[#E2E8F0] text-[#0F172A] gap-2"
            >
              <Eye className="h-4 w-4" strokeWidth={1.5} />
              Review Answers
            </Button>
            <div className="flex gap-2 flex-1 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowSubmitDialog(false)}
                className="border-[#E2E8F0] text-[#0F172A]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  submitExam()
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  submitExam()
                }}
                disabled={submitting}
                className="bg-[#10B981] hover:bg-[#059669] text-white gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Assessment
                    <Send className="h-4 w-4" strokeWidth={1.5} />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof String Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="border-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#10B981]" strokeWidth={1.5} />
              Assessment Submitted Offline
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              Your assessment was submitted while offline. Please save this proof code:
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#0F172A] p-4 rounded-lg font-mono text-xs break-all text-[#F8FAFC] border border-[#E2E8F0]">
            {proofString}
          </div>
          <p className="text-sm text-slate-600">
            Screenshot or save this code as proof of your submission completion.
          </p>
          <DialogFooter>
            <Button 
              onClick={() => router.push('/exam/completed')}
              className="bg-[#10B981] hover:bg-[#059669] text-white w-full"
            >
              Continue to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
