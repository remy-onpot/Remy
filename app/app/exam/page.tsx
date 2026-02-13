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
      // Look up quiz by code (any status — we handle routing below)
      const { data: quiz, error: quizError } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .single()

      if (quizError || !quiz) {
        setError('Invalid quiz code')
        return
      }

      // Check for existing session for this student
      const { data: existingSession } = await supabaseClient
        .from('exam_sessions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .ilike('index_number', indexNumber.trim())
        .in('status', ['in_progress', 'submitted', 'flagged'])
        .maybeSingle()

      // If quiz has ended, try to find ANY session to show results
      if (quiz.status === 'ended') {
        if (existingSession) {
          router.push(`/exam/session/${existingSession.id}/results`)
          return
        }
        // Broader search — maybe session has a different status
        const { data: anySession } = await supabaseClient
          .from('exam_sessions')
          .select('id')
          .eq('quiz_id', quiz.id)
          .ilike('index_number', indexNumber.trim())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (anySession) {
          router.push(`/exam/session/${anySession.id}/results`)
          return
        }
        setError('This quiz has ended. No exam session was found for your index number.')
        return
      }

      // If quiz is not live (e.g., draft), reject entry
      if (quiz.status !== 'live') {
        setError('This quiz is not currently live')
        return
      }

      // Check if index number is in roster
      const { data: rosterEntry, error: rosterError } = await supabaseClient
        .from('roster')
        .select('*')
        .eq('quiz_id', quiz.id)
        .ilike('index_number', indexNumber.trim())
        .maybeSingle()

      if (rosterError || !rosterEntry) {
        setError('Index number not found in roster for this exam')
        return
      }

      // Handle existing session (quiz is live at this point)
      if (existingSession) {
        if (existingSession.status === 'submitted' || existingSession.status === 'flagged') {
          setError('Exam submitted. Results will be available when the quiz ends.')
          return
        }
        // Resume existing in-progress session
        router.push(`/exam/session/${existingSession.id}`)
        return
      }

      // Create new session
      const deviceFingerprint = generateDeviceFingerprint()
      const userAgent = getUserAgent()
      
      const { data: session, error: sessionError } = await supabaseClient
        .from('exam_sessions')
        .insert({
          quiz_id: quiz.id,
          index_number: indexNumber.trim(),
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-[#E2E8F0] shadow-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield className="h-8 w-8 text-[#0F172A]" strokeWidth={1.5} />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#0F172A]">Commence Examination</CardTitle>
          <CardDescription className="text-slate-600">
            Enter your assessment code and identification number
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" strokeWidth={1.5} />
              <AlertDescription className="text-red-800 ml-2">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-[#0F172A] font-semibold">Assessment Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., MID-ABCD"
                required
                className="border-[#E2E8F0] focus:border-[#10B981]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="index" className="text-[#0F172A] font-semibold">Roll Number</Label>
              <Input
                id="index"
                value={indexNumber}
                onChange={(e) => setIndexNumber(e.target.value)}
                placeholder="e.g., 20240001"
                required
                className="border-[#E2E8F0] focus:border-[#10B981]"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white gap-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Initializing...
                </>
              ) : (
                <>
                  Commence Examination
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/" className="text-slate-600 hover:text-[#0F172A] flex items-center justify-center gap-2 font-medium">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
