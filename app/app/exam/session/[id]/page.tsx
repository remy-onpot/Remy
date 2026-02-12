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
  CheckCircle2
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="exam-fullscreen">
      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-banner flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          Offline Mode - Your answers are being saved locally
        </div>
      )}

      {/* Security Warning */}
      {showSecurityWarning && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
          <Alert variant="destructive" className="shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{securityMessage}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-semibold">{session?.quiz?.title}</h1>
          </div>
          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className={`exam-timer font-mono text-lg font-bold ${
                timeRemaining < 300 ? 'text-red-500 animate-pulse' : ''
              }`}>
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
            {/* Security Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Strikes:</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i <= securityState.strikes ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/exam/session/${sessionId}/review`)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Review
            </Button>
            <Button variant="outline" size="sm" onClick={enterFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Question */}
        {currentQ && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {currentQ.content}
              </h2>

              {currentQ.type === 'mcq' && currentQ.options && (
                <RadioGroup
                  value={answers[currentQ.id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="space-y-3"
                >
                  {currentQ.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
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
                  placeholder="Enter your answer here..."
                  rows={6}
                />
              )}

              {currentQ.type === 'boolean' && (
                <RadioGroup
                  value={answers[currentQ.id] || ''}
                  onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
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
          >
            Previous
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkipQuestion}
              className="gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </Button>
            
            {currentQuestion < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => setShowSubmitDialog(true)} variant="default">
                Submit Exam
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Jump to question:</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Answered
              </div>
              <div className="flex items-center gap-1">
                <SkipForward className="h-3 w-3 text-amber-500" />
                Skipped
              </div>
              <div className="flex items-center gap-1">
                <Circle className="h-3 w-3" />
                Unanswered
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
                  variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-10 h-10 p-0 ${
                    isSkipped && !isAnswered ? 'border-amber-500 bg-amber-50 hover:bg-amber-100' : ''
                  }`}
                >
                  {isAnswered ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : isSkipped ? (
                    <SkipForward className="h-4 w-4 text-amber-500" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Final Submission Confirmation</DialogTitle>
            <DialogDescription className="space-y-3 pt-2" asChild>
              <div className="text-sm text-muted-foreground space-y-3 pt-2">
              <p>You are about to submit your exam. This action <strong>CANNOT be undone</strong>.</p>
              
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Answered:
                  </span>
                  <strong>{Object.keys(answers).length} questions</strong>
                </div>
                
                {skippedQuestions.size > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <SkipForward className="h-4 w-4 text-amber-500" />
                      Skipped:
                    </span>
                    <strong className="text-amber-600">
                      {skippedQuestions.size} questions
                      {skippedQuestions.size > 0 && (
                        <span className="text-xs ml-2">
                          (Q{Array.from(skippedQuestions).map(qId => questions.findIndex(q => q.id === qId) + 1).join(', Q')})
                        </span>
                      )}
                    </strong>
                  </div>
                )}
                
                {questions.length - Object.keys(answers).length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      Unanswered:
                    </span>
                    <strong className="text-red-600">
                      {questions.length - Object.keys(answers).length} questions
                    </strong>
                  </div>
                )}
              </div>
              
              {(skippedQuestions.size > 0 || questions.length - Object.keys(answers).length > 0) && (
                <p className="text-amber-600 font-medium">
                  ⚠️ Skipped and unanswered questions will receive 0 points.
                </p>
              )}
              
              <p className="text-sm text-muted-foreground">
                Are you sure you want to submit now?
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
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Review Answers
            </Button>
            <div className="flex gap-2 flex-1 justify-end">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
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
                variant="destructive"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Yes, Submit Exam'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof String Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exam Submitted Offline</DialogTitle>
            <DialogDescription>
              Your exam was submitted while offline. Please save this proof string:
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-100 p-4 rounded-lg font-mono text-xs break-all">
            {proofString}
          </div>
          <p className="text-sm text-muted-foreground">
            Screenshot this code as proof of your submission.
          </p>
          <DialogFooter>
            <Button onClick={() => router.push('/exam/completed')}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
