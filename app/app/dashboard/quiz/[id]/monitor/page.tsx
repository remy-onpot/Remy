'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Power,
  RefreshCw,
  Loader2,
  WifiOff,
  UserX,
  Activity,
  BarChart3
} from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { LiveMonitorStudent, Quiz, QuizSettings, StudentMonitorStatus } from '@/types'
import { toast } from 'sonner'

interface MonitorPageProps {
  params: Promise<{ id: string }>
}

// Constants for status determination
const HEARTBEAT_ACTIVE_THRESHOLD = 30 // seconds
const HEARTBEAT_OFFLINE_THRESHOLD = 60 // seconds
const HEARTBEAT_AWAY_THRESHOLD = 15 // seconds — only show 'away' if heartbeat confirms unfocused for this long
const VIOLATION_THRESHOLD = 3 // strikes before flagging

export default function MonitorPage({ params }: MonitorPageProps) {
  const { id: quizId } = use(params)
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [students, setStudents] = useState<LiveMonitorStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to transform database row to Quiz type
  const transformQuiz = (row: any): Quiz => ({
    ...row,
    settings: row.settings as QuizSettings
  })

  /**
   * Determines student status based on session data and heartbeat timing
   * Production-grade logic with proper threshold checks
   */
  const determineStudentStatus = (
    session: any | null,
    heartbeatAgeSeconds: number | null,
    quizStrictness?: string
  ): StudentMonitorStatus => {
    // Not in roster or no session created
    if (!session) return 'not_joined'

    // Check if submitted
    if (session.status === 'submitted') return 'submitted'

    // Check if flagged by system or excessive strikes
    if (session.status === 'flagged' || session.strikes >= VIOLATION_THRESHOLD) return 'flagged'

    // No heartbeat data yet (just joined)
    if (heartbeatAgeSeconds === null) return 'active'

    // Heartbeat too old - connection lost
    if (heartbeatAgeSeconds > HEARTBEAT_OFFLINE_THRESHOLD) return 'offline'

    // Only check fullscreen for high strictness (mobile doesn't support it reliably)
    const requireFullscreen = quizStrictness === 'high'
    const isFullscreenOk = !requireFullscreen || session.is_fullscreen

    // Only mark 'away' if the heartbeat has been reporting unfocused AND
    // the heartbeat itself is recent (within the away threshold window).
    // This prevents brief mobile interruptions from showing as 'away'.
    if (session.focus_status !== 'focused' && heartbeatAgeSeconds <= HEARTBEAT_AWAY_THRESHOLD) {
      return 'away'
    }

    // Fullscreen violation on high strictness
    if (!isFullscreenOk && heartbeatAgeSeconds <= HEARTBEAT_ACTIVE_THRESHOLD) {
      return 'away'
    }

    // All good - actively taking exam
    return 'active'
  }

  /**
   * Calculate age of last heartbeat in seconds
   */
  const calculateHeartbeatAge = (lastHeartbeat: string | null): number | null => {
    if (!lastHeartbeat) return null
    const now = Date.now()
    const heartbeatTime = new Date(lastHeartbeat).getTime()
    return Math.floor((now - heartbeatTime) / 1000)
  }

  /**
   * Load all data for monitoring
   * Roster-first approach: show ALL students, then enrich with session data
   */
  const loadStudents = async () => {
    try {
      setError(null)

      // Fetch roster (primary source - ALL enrolled students)
      const { data: roster, error: rosterError } = await supabaseClient
        .from('roster')
        .select('*')
        .eq('quiz_id', quizId)
        .order('student_name', { ascending: true })

      if (rosterError) throw new Error(`Failed to load roster: ${rosterError.message}`)
      if (!roster) throw new Error('No roster found for this quiz')

      // Fetch all exam sessions for this quiz
      const { data: sessions, error: sessionsError } = await supabaseClient
        .from('exam_sessions')
        .select('*')
        .eq('quiz_id', quizId)

      if (sessionsError) throw new Error(`Failed to load sessions: ${sessionsError.message}`)

      // Fetch security log counts per session
      const { data: securityCounts, error: securityError } = await supabaseClient
        .from('security_logs')
        .select('session_id')
        .in('session_id', sessions?.map(s => s.id) || [])

      // Create lookup maps for efficient access
      const sessionMap = new Map(
        sessions?.map(s => [s.index_number, s]) || []
      )

      const violationCountMap = new Map<string, number>()
      securityCounts?.forEach(log => {
        const count = violationCountMap.get(log.session_id) || 0
        violationCountMap.set(log.session_id, count + 1)
      })

      // Map roster to monitor students with session data
      const now = Date.now()
      const monitorStudents: LiveMonitorStudent[] = roster.map(rosterEntry => {
        const session = sessionMap.get(rosterEntry.index_number)
        const heartbeatAge = session?.last_heartbeat 
          ? calculateHeartbeatAge(session.last_heartbeat)
          : null
        const quizStrictness = (quiz as any)?.settings?.strictness
        const status = determineStudentStatus(session, heartbeatAge, quizStrictness)

        return {
          index_number: rosterEntry.index_number,
          student_name: rosterEntry.student_name,
          status,
          session_id: session?.id || null,
          joined_at: session?.started_at || null,
          last_heartbeat: session?.last_heartbeat || null,
          completed_at: session?.completed_at || null,
          strikes: session?.strikes || 0,
          violations_count: session ? (violationCountMap.get(session.id) || 0) : 0,
          heartbeat_age_seconds: heartbeatAge,
          is_focus_lost: session ? (session.focus_status !== 'focused') : false,
        }
      })

      setStudents(monitorStudents)
    } catch (err: any) {
      console.error('Error loading monitor data:', err)
      setError(err.message || 'Failed to load monitoring data')
      toast.error(err.message || 'Failed to load data')
    }
  }

  /**
   * Initialize: Verify auth, load quiz, verify ownership, setup real-time
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        // Security check: Verify user is authenticated
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
          toast.error('Authentication required')
          router.push('/login')
          return
        }

        // Load quiz data
        const { data: quizData, error: quizError } = await supabaseClient
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single()

        if (quizError || !quizData) {
          toast.error('Quiz not found')
          router.push('/dashboard')
          return
        }

        // Security check: Verify this user owns the quiz
        if (quizData.lecturer_id !== user.id) {
          toast.error('Unauthorized access')
          router.push('/dashboard')
          return
        }

        setQuiz(transformQuiz(quizData))

        // Load initial student data
        await loadStudents()
        setLoading(false)

        // Setup real-time subscription for live updates
        const subscription = supabaseClient
          .channel(`quiz-monitor-${quizId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'exam_sessions',
              filter: `quiz_id=eq.${quizId}`,
            },
            () => {
              // Reload data when sessions change
              loadStudents()
            }
          )
          .subscribe()

        return () => {
          subscription.unsubscribe()
        }
      } catch (err: any) {
        console.error('Initialization error:', err)
        toast.error('Failed to initialize monitor')
        setLoading(false)
      }
    }

    initialize()
  }, [quizId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStudents()
    setRefreshing(false)
  }

  /**
   * Force submit a student's exam (emergency action)
   */
  const handleForceSubmit = async (sessionId: string, studentName: string) => {
    if (
      !confirm(
        `Are you sure you want to force submit ${studentName}'s exam?\n\nThis action cannot be undone and will immediately end their session.`
      )
    ) {
      return
    }

    try {
      const { error } = await supabaseClient
        .from('exam_sessions')
        .update({
          status: 'submitted',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (error) throw error

      toast.success('Exam force submitted successfully')
      loadStudents()
    } catch (error: any) {
      console.error('Force submit error:', error)
      toast.error('Failed to force submit exam')
    }
  }

  /**
   * Calculate statistics from current student data
   */
  const stats = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    away: students.filter(s => s.status === 'away').length,
    offline: students.filter(s => s.status === 'offline').length,
    notJoined: students.filter(s => s.status === 'not_joined').length,
    flagged: students.filter(s => s.status === 'flagged').length,
    submitted: students.filter(s => s.status === 'submitted').length,
    totalViolations: students.reduce((sum, s) => sum + s.violations_count, 0),
  }

  /**
   * Render status badge with appropriate styling
   */
  const getStatusBadge = (status: StudentMonitorStatus) => {
    const badges = {
      not_joined: <Badge variant="secondary" className="gap-1"><UserX className="h-3 w-3" />Not Joined</Badge>,
      active: <Badge variant="default" className="bg-green-500 gap-1"><Activity className="h-3 w-3" />Active</Badge>,
      away: <Badge variant="default" className="bg-amber-500 gap-1"><Clock className="h-3 w-3" />Away</Badge>,
      offline: <Badge variant="default" className="bg-orange-500 gap-1"><WifiOff className="h-3 w-3" />Offline</Badge>,
      flagged: <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Flagged</Badge>,
      submitted: <Badge variant="default" className="bg-blue-500 gap-1"><CheckCircle className="h-3 w-3" />Submitted</Badge>,
    }
    return badges[status] || <Badge variant="secondary">{status}</Badge>
  }

  /**
   * Format heartbeat age for display
   */
  const formatHeartbeatAge = (ageSeconds: number | null): string => {
    if (ageSeconds === null) return 'N/A'
    if (ageSeconds < 60) return `${ageSeconds}s ago`
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`
    return `${Math.floor(ageSeconds / 3600)}h ago`
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Error state
  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error || 'Failed to load quiz'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <h1 className="font-semibold">Live Monitor: {quiz?.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/quiz/${quizId}/analytics`}>
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Roster</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold text-green-500">{stats.active}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Not Joined</p>
                  <p className="text-3xl font-bold text-slate-500">{stats.notJoined}</p>
                </div>
                <UserX className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Flagged</p>
                  <p className="text-3xl font-bold text-red-500">{stats.flagged}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="text-3xl font-bold text-blue-500">{stats.submitted}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Roster</CardTitle>
            <CardDescription>
              Real-time monitoring of all registered students (Active: {stats.active} | Away: {stats.away} | Offline: {stats.offline})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No students in roster</h3>
                <p className="text-muted-foreground">
                  Add students to the roster to monitor their exam activity
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Index Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Heartbeat</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.index_number}>
                      <TableCell className="font-mono">{student.index_number}</TableCell>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.status === 'not_joined' ? 'N/A' : formatHeartbeatAge(student.heartbeat_age_seconds)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${student.violations_count >= VIOLATION_THRESHOLD ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {student.violations_count}
                          </span>
                          {student.violations_count > 0 && (
                            <div className="flex gap-1">
                              {Array.from({ length: Math.min(3, student.violations_count) }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    student.violations_count >= VIOLATION_THRESHOLD ? 'bg-red-500' : 'bg-amber-500'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.status === 'not_joined' ? (
                          <span className="text-sm text-muted-foreground">Not joined</span>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={student.status === 'submitted'}
                            onClick={() => student.session_id && handleForceSubmit(student.session_id, student.student_name)}
                          >
                            <Power className="h-3 w-3 mr-1" />
                            {student.status === 'submitted' ? 'Submitted' : 'Force Submit'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
