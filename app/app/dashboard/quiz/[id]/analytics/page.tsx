'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Loader2,
  Search,
  BarChart3
} from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { Quiz, QuizSettings } from '@/types'
import { exportToExcelWithSheets } from '@/lib/export'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface AnalyticsPageProps {
  params: Promise<{ id: string }>
}

interface StudentResult {
  index_number: string
  student_name: string
  score: number | null
  percentage: number
  time_taken: number | null
  violations: number
  status: 'in_progress' | 'submitted' | 'flagged'
  session_id: string
}

interface QuestionStats {
  question_id: string
  content: string
  position: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  correct_percentage: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { id: quizId } = use(params)
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [students, setStudents] = useState<StudentResult[]>([])
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([])
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([])
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      // TODO: Add auth check - verify user is authenticated

      // Fetch quiz
      const { data: quizData, error: quizError } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (quizError || !quizData) {
        setError('Quiz not found')
        return
      }

      // TODO: Add ownership check - verify lecturer_id matches current user

      setQuiz({
        ...quizData,
        settings: quizData.settings as unknown as QuizSettings
      } as Quiz)

      // Fetch roster
      const { data: roster, error: rosterError } = await supabaseClient
        .from('roster')
        .select('*')
        .eq('quiz_id', quizId)

      if (rosterError) throw rosterError

      // Fetch exam sessions
      const { data: sessions, error: sessionsError } = await supabaseClient
        .from('exam_sessions')
        .select('*')
        .eq('quiz_id', quizId)

      if (sessionsError) throw sessionsError

      // Fetch security logs
      const { data: securityLogs, error: logsError } = await supabaseClient
        .from('security_logs')
        .select('session_id')
        .in('session_id', sessions?.map(s => s.id) || [])

      const violationCountMap = new Map<string, number>()
      securityLogs?.forEach(log => {
        violationCountMap.set(log.session_id, (violationCountMap.get(log.session_id) || 0) + 1)
      })

      // Fetch questions
      const { data: questions, error: questionsError } = await supabaseClient
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('position')

      if (questionsError) throw questionsError

      // Fetch all answers
      const { data: answers, error: answersError } = await supabaseClient
        .from('answers')
        .select('*')
        .in('session_id', sessions?.map(s => s.id) || [])

      if (answersError) throw answersError

      // Fetch all options
      const { data: options, error: optionsError } = await supabaseClient
        .from('options')
        .select('*')

      if (optionsError) throw optionsError

      // Build student results
      const studentResults: StudentResult[] = []
      const rosterMap = new Map(roster?.map(r => [r.index_number, r]) || [])
      const sessionMap = new Map(sessions?.map(s => [s.index_number, s]) || [])

      for (const rosterEntry of roster || []) {
        const session = sessionMap.get(rosterEntry.index_number)
        
        if (!session) {
          // Student hasn't started
          studentResults.push({
            index_number: rosterEntry.index_number,
            student_name: rosterEntry.student_name,
            score: null,
            percentage: 0,
            time_taken: null,
            violations: 0,
            status: 'in_progress',
            session_id: ''
          })
          continue
        }

        const timeTaken = session.completed_at && session.started_at
          ? Math.floor((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)
          : null

        const totalQuestions = questions?.length || 1
        const totalPoints = questions?.reduce((sum, q) => sum + q.points, 0) || 1
        const percentage = session.score ? Math.round((session.score / totalPoints) * 100) : 0

        studentResults.push({
          index_number: rosterEntry.index_number,
          student_name: rosterEntry.student_name,
          score: session.score || 0,
          percentage,
          time_taken: timeTaken,
          violations: violationCountMap.get(session.id) || 0,
          status: session.status as any,
          session_id: session.id
        })
      }

      setStudents(studentResults)

      // Build question statistics
      const questionStatsArray: QuestionStats[] = []
      const optionsMap = new Map<string, any[]>()
      options?.forEach(opt => {
        if (!optionsMap.has(opt.question_id)) {
          optionsMap.set(opt.question_id, [])
        }
        optionsMap.get(opt.question_id)!.push(opt)
      })

      const answersMap = new Map<string, any[]>()
      answers?.forEach(ans => {
        if (!answersMap.has(ans.question_id)) {
          answersMap.set(ans.question_id, [])
        }
        answersMap.get(ans.question_id)!.push(ans)
      })

      for (const question of questions || []) {
        const questionAnswers = answersMap.get(question.id) || []
        const questionOptions = optionsMap.get(question.id) || []
        const correctOption = questionOptions.find(o => o.is_correct)

        let correctCount = 0
        let wrongCount = 0
        const totalSubmitted = sessions?.filter(s => s.status === 'submitted' || s.status === 'flagged').length || 1

        questionAnswers.forEach(answer => {
          if (!answer.selected_option_id && !answer.text_response) return

          if (question.type === 'mcq' || question.type === 'boolean') {
            if (answer.selected_option_id === correctOption?.id) {
              correctCount++
            } else {
              wrongCount++
            }
          }
        })

        const unansweredCount = totalSubmitted - correctCount - wrongCount
        const correctPercentage = totalSubmitted > 0 ? Math.round((correctCount / totalSubmitted) * 100) : 0

        let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'
        if (correctPercentage >= 80) difficulty = 'Easy'
        else if (correctPercentage < 50) difficulty = 'Hard'

        questionStatsArray.push({
          question_id: question.id,
          content: question.content,
          position: question.position,
          correct_count: correctCount,
          wrong_count: wrongCount,
          unanswered_count: unansweredCount,
          correct_percentage: correctPercentage,
          difficulty
        })
      }

      setQuestionStats(questionStatsArray)

      // Build grade distribution
      const distribution = [
        { range: '0-49', count: 0, label: 'Fail' },
        { range: '50-59', count: 0, label: 'D' },
        { range: '60-69', count: 0, label: 'C' },
        { range: '70-79', count: 0, label: 'B' },
        { range: '80-89', count: 0, label: 'A-' },
        { range: '90-100', count: 0, label: 'A+' }
      ]

      studentResults.forEach(student => {
        if (student.status !== 'submitted' && student.status !== 'flagged') return

        if (student.percentage < 50) distribution[0].count++
        else if (student.percentage < 60) distribution[1].count++
        else if (student.percentage < 70) distribution[2].count++
        else if (student.percentage < 80) distribution[3].count++
        else if (student.percentage < 90) distribution[4].count++
        else distribution[5].count++
      })

      setGradeDistribution(distribution)

    } catch (err: any) {
      console.error('Analytics error:', err)
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const csvData = filteredStudents.map(s => ({
      'Index Number': s.index_number,
      'Name': s.student_name,
      'Score': s.score !== null ? s.score : 'N/A',
      'Percentage': `${s.percentage}%`,
      'Time': s.time_taken ? formatTime(s.time_taken) : 'N/A',
      'Violations': s.violations,
      'Status': s.status
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quiz?.code}-results.csv`
    a.click()
  }

  const handleExportExcel = async () => {
    const resultsData = filteredStudents.map(s => ({
      'Index Number': s.index_number,
      'Name': s.student_name,
      'Score': s.score !== null ? s.score : 'N/A',
      'Percentage': s.percentage,
      'Time (seconds)': s.time_taken || 'N/A',
      'Violations': s.violations,
      'Status': s.status
    }))

    const questionData = questionStats.map(q => ({
      'Position': q.position,
      'Question': q.content.substring(0, 50) + '...',
      'Correct': q.correct_count,
      'Wrong': q.wrong_count,
      'Unanswered': q.unanswered_count,
      'Correct %': q.correct_percentage,
      'Difficulty': q.difficulty
    }))

    await exportToExcelWithSheets(
      [
        { name: 'Results', data: resultsData },
        { name: 'Questions', data: questionData }
      ],
      `${quiz?.code}-analytics`
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error || 'Quiz not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate summary stats
  const totalRoster = students.length
  const completed = students.filter(s => s.status === 'submitted' || s.status === 'flagged').length
  const inProgress = students.filter(s => s.status === 'in_progress' && s.session_id).length
  const notStarted = students.filter(s => !s.session_id).length
  const flagged = students.filter(s => s.status === 'flagged').length

  const submittedStudents = students.filter(s => s.status === 'submitted' || s.status === 'flagged')
  const avgScore = submittedStudents.length > 0
    ? Math.round(submittedStudents.reduce((sum, s) => sum + s.percentage, 0) / submittedStudents.length)
    : 0
  const highest = submittedStudents.length > 0
    ? Math.max(...submittedStudents.map(s => s.percentage))
    : 0
  const lowest = submittedStudents.length > 0
    ? Math.min(...submittedStudents.filter(s => s.score !== null).map(s => s.percentage))
    : 0

  const medianTime = submittedStudents.length > 0
    ? submittedStudents
        .filter(s => s.time_taken !== null)
        .sort((a, b) => (a.time_taken || 0) - (b.time_taken || 0))[Math.floor(submittedStudents.length / 2)]
        ?.time_taken || 0
    : 0

  // Filtered students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.index_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">{quiz.title}</h1>
              <p className="text-sm text-muted-foreground">Analytics & Results</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button onClick={handleExportExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Summary Stats Grid */}
        <div className="grid md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Roster</p>
                  <p className="text-3xl font-bold">{totalRoster}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average</p>
                  <p className="text-3xl font-bold">{avgScore}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Highest</p>
                  <p className="text-3xl font-bold text-green-600">{highest}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lowest</p>
                  <p className="text-3xl font-bold text-red-600">{lowest}%</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Flagged</p>
                  <p className="text-3xl font-bold text-red-600">{flagged}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Med. Time</p>
                  <p className="text-2xl font-bold">{formatTime(medianTime)}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grade Distribution Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Grade Distribution</CardTitle>
            </div>
            <CardDescription>Score range breakdown for submitted exams</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Question Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Question Analysis</CardTitle>
            <CardDescription>Performance breakdown by question</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="text-center">Correct</TableHead>
                  <TableHead className="text-center">Wrong</TableHead>
                  <TableHead className="text-center">Unanswered</TableHead>
                  <TableHead className="text-center">Correct %</TableHead>
                  <TableHead>Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionStats.map((q) => (
                  <TableRow key={q.question_id}>
                    <TableCell className="font-medium">{q.position}</TableCell>
                    <TableCell className="max-w-md truncate">{q.content}</TableCell>
                    <TableCell className="text-center text-green-600">{q.correct_count}</TableCell>
                    <TableCell className="text-center text-red-600">{q.wrong_count}</TableCell>
                    <TableCell className="text-center text-gray-600">{q.unanswered_count}</TableCell>
                    <TableCell className="text-center font-medium">{q.correct_percentage}%</TableCell>
                    <TableCell>
                      <Badge variant={
                        q.difficulty === 'Easy' ? 'default' :
                        q.difficulty === 'Medium' ? 'secondary' :
                        'destructive'
                      } className={
                        q.difficulty === 'Easy' ? 'bg-green-500' :
                        q.difficulty === 'Medium' ? 'bg-amber-500' :
                        ''
                      }>
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Student Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Results</CardTitle>
                <CardDescription>Individual performance data</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Index</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-center">Time</TableHead>
                  <TableHead className="text-center">Violations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.index_number}>
                    <TableCell className="font-mono">{student.index_number}</TableCell>
                    <TableCell className="font-medium">{student.student_name}</TableCell>
                    <TableCell className="text-center">{student.score !== null ? student.score : '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={
                        student.percentage >= 80 ? 'text-green-600 font-bold' :
                        student.percentage >= 60 ? 'text-blue-600' :
                        student.percentage >= 40 ? 'text-amber-600' :
                        'text-red-600 font-bold'
                      }>
                        {student.percentage}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {student.time_taken ? formatTime(student.time_taken) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {student.violations > 0 ? (
                        <Badge variant="destructive">{student.violations}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        student.status === 'submitted' ? 'default' :
                        student.status === 'flagged' ? 'destructive' :
                        'secondary'
                      } className={
                        student.status === 'submitted' ? 'bg-blue-500' :
                        student.status === 'in_progress' && student.session_id ? 'bg-amber-500' :
                        ''
                      }>
                        {student.status === 'in_progress' && !student.session_id ? 'Not Started' : student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.session_id && (student.status === 'submitted' || student.status === 'flagged') && (
                        <Link href={`/exam/session/${student.session_id}/results`}>
                          <Button variant="outline" size="sm">View Results</Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
