'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase'
import { Quiz, QuizSettings } from '@/types'
import { exportToExcelWithSheets } from '@/lib/export'

// UI Primitives
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, Loader2, PenTool } from 'lucide-react'

// Sub-components
import SummaryCards from '@/components/analytics/SummaryCards'
import GradeDistributionChart from '@/components/analytics/GradeDistributionChart'
import QuestionAnalysisTable from '@/components/analytics/QuestionAnalysisTable'
import StudentResultsTable from '@/components/analytics/StudentResultsTable'

// --- EXPORTED TYPES (So sub-components can use them) ---
export interface StudentResult {
  index_number: string
  student_name: string
  score: number | null
  percentage: number
  time_taken: number | null
  violations: number
  status: 'in_progress' | 'submitted' | 'flagged'
  session_id: string
}

export interface QuestionStats {
  question_id: string
  content: string
  position: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  correct_percentage: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

interface AnalyticsClientProps {
  quizId: string
}

export default function AnalyticsClient({ quizId }: AnalyticsClientProps) {
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [students, setStudents] = useState<StudentResult[]>([])
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([])
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      // 1. SECURITY: Authenticate User
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // 2. Fetch Quiz
      const { data: quizData, error: quizError } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (quizError || !quizData) {
        setError('Quiz not found')
        return
      }

      // 3. SECURITY: Verify Ownership
      if (quizData.lecturer_id !== user.id) {
        setError('Unauthorized: You do not have permission to view this quiz.')
        return
      }

      setQuiz({
        ...quizData,
        settings: quizData.settings as unknown as QuizSettings
      } as Quiz)

      // 4. Fetch Core Data
      const [
        { data: roster }, { data: sessions }, { data: questions }, { data: options }
      ] = await Promise.all([
        supabaseClient.from('roster').select('*').eq('quiz_id', quizId),
        supabaseClient.from('exam_sessions').select('*').eq('quiz_id', quizId),
        supabaseClient.from('questions').select('*').eq('quiz_id', quizId).order('position'),
        supabaseClient.from('options').select('*')
      ])

      const sessionIds = sessions?.map(s => s.id) || []
      const [ { data: securityLogs }, { data: answers } ] = await Promise.all([
        sessionIds.length ? supabaseClient.from('security_logs').select('session_id').in('session_id', sessionIds) : { data: [] },
        sessionIds.length ? supabaseClient.from('answers').select('*').in('session_id', sessionIds) : { data: [] }
      ])

      // 5. Process Violations
      const violationCountMap = new Map<string, number>()
      securityLogs?.forEach(log => {
        if (log.session_id) {
          violationCountMap.set(log.session_id, (violationCountMap.get(log.session_id) || 0) + 1)
        }
      })

      // 6. Build Student Results
      const studentResults: StudentResult[] = []
      const sessionMap = new Map(sessions?.map(s => [s.index_number, s]) || [])
      const totalPoints = questions?.reduce((sum, q) => sum + (q.points ?? 0), 0) || 1

      for (const rosterEntry of roster || []) {
        const session = sessionMap.get(rosterEntry.index_number)
        
        if (!session) {
          studentResults.push({
            index_number: rosterEntry.index_number, student_name: rosterEntry.student_name,
            score: null, percentage: 0, time_taken: null, violations: 0, status: 'in_progress', session_id: ''
          })
          continue
        }

        const timeTaken = session.completed_at && session.started_at
          ? Math.floor((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)
          : null

        studentResults.push({
          index_number: rosterEntry.index_number, student_name: rosterEntry.student_name,
          score: session.score || 0,
          percentage: session.score ? Math.round((session.score / totalPoints) * 100) : 0,
          time_taken: timeTaken,
          violations: violationCountMap.get(session.id) || 0,
          status: session.status as any, session_id: session.id
        })
      }
      setStudents(studentResults)

      // 7. Build Question Statistics
      const questionStatsArray: QuestionStats[] = []
      const optionsMap = new Map<string, any[]>()
      options?.forEach(opt => {
        if (opt.question_id) {
          if (!optionsMap.has(opt.question_id)) optionsMap.set(opt.question_id, [])
          optionsMap.get(opt.question_id)!.push(opt)
        }
      })

      const answersMap = new Map<string, any[]>()
      answers?.forEach(ans => {
        if (!answersMap.has(ans.question_id)) answersMap.set(ans.question_id, [])
        answersMap.get(ans.question_id)!.push(ans)
      })

      for (const question of questions || []) {
        const questionAnswers = answersMap.get(question.id) || []
        const correctOption = (optionsMap.get(question.id) || []).find(o => o.is_correct)
        let correctCount = 0, wrongCount = 0
        const totalSubmitted = sessions?.filter(s => s.status === 'submitted' || s.status === 'flagged').length || 1

        questionAnswers.forEach(answer => {
          if (!answer.selected_option_id && !answer.text_response) return
          if (question.type === 'mcq' || question.type === 'boolean') {
            answer.selected_option_id === correctOption?.id ? correctCount++ : wrongCount++
          }
        })

        const correctPercentage = totalSubmitted > 0 ? Math.round((correctCount / totalSubmitted) * 100) : 0
        const difficulty = correctPercentage >= 80 ? 'Easy' : correctPercentage < 50 ? 'Hard' : 'Medium'

        questionStatsArray.push({
          question_id: question.id, content: question.content, position: question.position,
          correct_count: correctCount, wrong_count: wrongCount,
          unanswered_count: totalSubmitted - correctCount - wrongCount,
          correct_percentage: correctPercentage, difficulty
        })
      }
      setQuestionStats(questionStatsArray)

      // 8. Build Grade Distribution
      const distribution = [
        { range: '0-49', count: 0, label: 'Fail' }, { range: '50-59', count: 0, label: 'D' },
        { range: '60-69', count: 0, label: 'C' }, { range: '70-79', count: 0, label: 'B' },
        { range: '80-89', count: 0, label: 'A-' }, { range: '90-100', count: 0, label: 'A+' }
      ]

      studentResults.filter(s => s.status === 'submitted' || s.status === 'flagged').forEach(student => {
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
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  // Helpers & Exports
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.index_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleExportCSV = () => {
    const csvData = filteredStudents.map(s => ({
      'Index Number': s.index_number, 'Name': s.student_name,
      'Score': s.score !== null ? s.score : 'N/A', 'Percentage': `${s.percentage}%`,
      'Time': s.time_taken ? formatTime(s.time_taken) : 'N/A',
      'Violations': s.violations, 'Status': s.status
    }))

    const csv = [Object.keys(csvData[0]).join(','), ...csvData.map(row => Object.values(row).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quiz?.code}-results.csv`
    a.click()
  }

  const handleExportExcel = async () => {
    const resultsData = filteredStudents.map(s => ({
      'Index Number': s.index_number, 'Name': s.student_name,
      'Score': s.score !== null ? s.score : 'N/A', 'Percentage': s.percentage,
      'Time (seconds)': s.time_taken || 'N/A', 'Violations': s.violations, 'Status': s.status
    }))

    const questionData = questionStats.map(q => ({
      'Position': q.position, 'Question': q.content.substring(0, 50) + '...',
      'Correct': q.correct_count, 'Wrong': q.wrong_count, 'Unanswered': q.unanswered_count,
      'Correct %': q.correct_percentage, 'Difficulty': q.difficulty
    }))

    await exportToExcelWithSheets([
        { name: 'Results', data: resultsData },
        { name: 'Questions', data: questionData }
      ], `${quiz?.code}-analytics`)
  }

  // Error & Loading States
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error || 'Quiz not found'}</CardDescription>
          </CardHeader>
          <CardContent><Link href="/dashboard"><Button>Return to Dashboard</Button></Link></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
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
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/quiz/${quiz.id}/grading`}>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm mr-2">
                <PenTool className="h-4 w-4" /> 
                Grade Subjective
              </Button>
            </Link>
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={handleExportExcel} className="gap-2">
              <Download className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        <SummaryCards students={students} formatTime={formatTime} />

        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <GradeDistributionChart data={gradeDistribution} />
            </div>
            <div className="lg:col-span-1 flex flex-col justify-center bg-white border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Insight summary</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Review the Question Analysis below to identify knowledge gaps before finalizing grades.
                </p>
            </div>
        </div>

        <QuestionAnalysisTable stats={questionStats} />

        <StudentResultsTable 
            students={filteredStudents} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter} 
            setStatusFilter={setStatusFilter}
            formatTime={formatTime}
        />
      </main>
    </div>
  )
}