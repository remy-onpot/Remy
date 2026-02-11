'use client'

import { useEffect, useState } from 'react'
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
  Loader2
} from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { LiveMonitorStudent, Quiz } from '@/types'
import { toast } from 'sonner'

interface MonitorPageProps {
  params: { id: string }
}

export default function MonitorPage({ params }: MonitorPageProps) {
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [students, setStudents] = useState<LiveMonitorStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const quizId = params.id

  useEffect(() => {
    loadData()

    // Subscribe to realtime updates
    const subscription = supabaseClient
      .channel(`quiz-${quizId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_sessions',
          filter: `quiz_id=eq.${quizId}`,
        },
        () => {
          loadStudents()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [quizId])

  const loadData = async () => {
    try {
      // Get quiz
      const { data: quizData } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (quizData) {
        setQuiz(quizData)
      }

      await loadStudents()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    try {
      const { data: sessions } = await supabaseClient
        .from('exam_sessions')
        .select('*, roster:roster(student_name)')
        .eq('quiz_id', quizId)
        .order('started_at', { ascending: false })

      if (sessions) {
        const mappedStudents: LiveMonitorStudent[] = sessions.map((s: any) => ({
          session_id: s.id,
          index_number: s.index_number,
          student_name: s.roster?.student_name || 'Unknown',
          status: s.focus_status === 'focused' ? 'focused' : s.focus_status === 'blurred' ? 'warning' : 'danger',
          joined_at: s.started_at,
          last_heartbeat: s.last_heartbeat || s.started_at,
          strikes: s.strikes || 0,
        }))
        setStudents(mappedStudents)
      }
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStudents()
    setRefreshing(false)
  }

  const handleForceSubmit = async (sessionId: string) => {
    if (!confirm('Are you sure you want to force submit this student\'s exam?')) {
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

      toast.success('Exam force submitted')
      loadStudents()
    } catch (error) {
      toast.error('Failed to force submit')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'focused':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" /> Focused</Badge>
      case 'warning':
        return <Badge className="bg-amber-500 gap-1"><Clock className="h-3 w-3" /> Away</Badge>
      case 'danger':
        return <Badge className="bg-red-500 gap-1"><AlertTriangle className="h-3 w-3" /> Violation</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const focusedCount = students.filter(s => s.status === 'focused').length
  const warningCount = students.filter(s => s.status === 'warning').length
  const dangerCount = students.filter(s => s.status === 'danger').length

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
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold">{students.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Focused</p>
                  <p className="text-3xl font-bold text-green-500">{focusedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Away</p>
                  <p className="text-3xl font-bold text-amber-500">{warningCount}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Violations</p>
                  <p className="text-3xl font-bold text-red-500">{dangerCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Students</CardTitle>
            <CardDescription>
              Real-time monitoring of student activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No students yet</h3>
                <p className="text-muted-foreground">
                  Students will appear here when they join the exam
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Index Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.session_id}>
                      <TableCell className="font-mono">{student.index_number}</TableCell>
                      <TableCell>{student.student_name}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i <= student.strikes ? 'bg-red-500' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(student.joined_at).toLocaleTimeString()}</TableCell>
                      <TableCell>{new Date(student.last_heartbeat).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleForceSubmit(student.session_id)}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          Force Submit
                        </Button>
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
