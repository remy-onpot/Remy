'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { generateDeviceFingerprint, getUserAgent } from '@/lib/utils'

export default function ExamEntryPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [indexNumber, setIndexNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Client-side validation
    if (!code.trim()) {
      setError('Please enter a quiz code')
      setLoading(false)
      return
    }
    if (!indexNumber.trim()) {
      setError('Please enter your index number')
      setLoading(false)
      return
    }

    try {
      // Validate quiz code
      const { data: quiz, error: quizError } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('status', 'live')
        .single()

      if (quizError || !quiz) {
        setError('Invalid quiz code or quiz is not currently live')
        return
      }

      // Check if index number is in roster
      const { data: rosterEntry, error: rosterError } = await supabaseClient
        .from('roster')
        .select('*')
        .eq('quiz_id', quiz.id)
        .eq('index_number', indexNumber.trim())
        .single()

      if (rosterError || !rosterEntry) {
        setError('Index number not found in roster for this exam')
        return
      }

      // Check for existing session
      const { data: existingSession } = await supabaseClient
        .from('exam_sessions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .eq('index_number', indexNumber.trim())
        .in('status', ['in_progress', 'submitted', 'flagged'])
        .single()

      if (existingSession) {
        if (existingSession.status === 'submitted' || existingSession.status === 'flagged') {
          // Check if quiz has ended - if so, redirect to results
          if (quiz.status === 'ended') {
            router.push(`/exam/session/${existingSession.id}/results`)
            return
          }
          // Quiz still live - show waiting message
          setError('Exam submitted. Results will be available when the quiz ends.')
          return
        }
        // Resume existing session
        router.push(`/exam/session/${existingSession.id}`)
        return
      }

      // Check if quiz is still accepting new sessions
      if (quiz.status !== 'live') {
        setError('This quiz is no longer accepting submissions')
        return
      }

      // Create new session
      const deviceFingerprint = generateDeviceFingerprint()
      const userAgent = getUserAgent()
      
      const { data: session, error: sessionError } = await supabaseClient
        .from('exam_sessions')
        .insert({
          quiz_id: quiz.id,
          index_number: indexNumber,
          device_fingerprint: deviceFingerprint,
          user_agent: userAgent,
          status: 'in_progress'
        })
        .select()
        .single()

      if (sessionError) {
        setError('Failed to create exam session')
        return
      }

      router.push(`/exam/session/${session.id}`)
    } catch (err: any) {
      console.error('Exam entry error:', err)
      setError(err.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter Exam Room</CardTitle>
          <CardDescription>
            Enter your quiz code and index number to start
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Quiz Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., MID-ABCD"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="index">Index Number</Label>
              <Input
                id="index"
                value={indexNumber}
                onChange={(e) => setIndexNumber(e.target.value)}
                placeholder="e.g., 20240001"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entering...
                </>
              ) : (
                'Enter Exam'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/" className="text-muted-foreground hover:text-primary flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
