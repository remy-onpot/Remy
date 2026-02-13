'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Plus, 
  Users, 
  Clock, 
  MoreVertical, 
  Play, 
  Square, 
  BarChart3,
  LogOut,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabaseClient } from '@/lib/supabase'
import { Quiz, QuizSettings } from '@/types'
import { formatDuration } from '@/lib/utils'
import { toast } from 'sonner'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Helper function to transform database row to Quiz type
  const transformQuiz = (row: any): Quiz => ({
    ...row,
    settings: row.settings as QuizSettings
  })

  useEffect(() => {
    checkAuth()
    fetchQuizzes()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
  }

  const fetchQuizzes = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabaseClient
        .from('quizzes')
        .select('*')
        .eq('lecturer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuizzes((data || []).map(transformQuiz))
    } catch (error: any) {
      console.error('Error fetching quizzes:', error)
      toast.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabaseClient.auth.signOut()
    router.push('/login')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-xs">Live</Badge>
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs">Draft</Badge>
      case 'ended':
        return <Badge className="bg-slate-200 text-slate-800 border border-slate-400 font-semibold text-xs">Concluded</Badge>
      case 'archived':
        return <Badge className="bg-amber-100 text-amber-700 border border-amber-300 font-semibold text-xs">Archived</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className={styles.loaderContainer}>
            <Loader2 className="h-8 w-8 text-[#0F172A] animate-spin" />
          </div>
          <p className="text-slate-600 font-medium mt-3">Loading assessments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b border-[#E2E8F0] bg-white backdrop-blur-sm transition-all ${styles.headerSlide}`}>
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${styles.logoFade}`}>
            <div className="h-10 w-10 rounded-lg bg-[#0F172A] flex items-center justify-center shadow-sm">
              <Shield className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-[#0F172A]">NimdeQuizzer</span>
              <span className="text-xs text-slate-500">Institution Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-600 hidden sm:block">
              {user?.email}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Page Title Section */}
        <div className={`mb-12 ${styles.titleFade}`}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#0F172A] mb-2" style={{lineHeight: '1.2'}}>
                Assessment Dashboard
              </h1>
              <p className="text-lg text-slate-600 font-normal">
                Manage examinations, monitor student progress, and oversee assessment integrity
              </p>
            </div>
            <Link href="/dashboard/quiz/new">
              <Button className="gap-2 bg-[#0F172A] hover:bg-slate-900 text-white font-semibold shadow-sm hover:shadow-md transition-all">
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Create Assessment
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid - Midnight & Mint Theme */}
        <div className={`grid md:grid-cols-4 gap-6 mb-12 ${styles.statsStagger}`}>
          {[
            { label: 'Total Assessments', value: quizzes.length, icon: Shield, color: 'navy' },
            { label: 'Active Examinations', value: quizzes.filter(q => q.status === 'live').length, icon: Play, color: 'emerald' },
            { label: 'Draft', value: quizzes.filter(q => q.status === 'draft').length, icon: Clock, color: 'slate' },
            { label: 'Concluded', value: quizzes.filter(q => q.status === 'ended').length, icon: BarChart3, color: 'slate' },
          ].map((stat, idx) => (
            <div key={idx} className={styles.statCard}>
              <Card className="border-[#E2E8F0] h-full hover:border-slate-400 hover:shadow-sm transition-all" style={{animationDelay: `${idx * 80}ms`}}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 tracking-wide mb-2">{stat.label}</p>
                      <p className="text-3xl font-bold text-[#0F172A]">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      stat.color === 'navy' ? 'bg-slate-100 border border-slate-200' :
                      stat.color === 'emerald' ? 'bg-emerald-50 border border-emerald-200' :
                      'bg-slate-50 border border-slate-200'
                    }`}>
                      <stat.icon className={`h-5 w-5 ${
                        stat.color === 'navy' ? 'text-[#0F172A]' :
                        stat.color === 'emerald' ? 'text-[#10B981]' :
                        'text-slate-600'
                      }`} strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Assessments Section */}
        <Card className={`border-[#E2E8F0] shadow-sm hover:shadow-md transition-all ${styles.contentFade}`}>
          <CardHeader className="border-b border-[#E2E8F0] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-[#0F172A] mb-1">All Assessments</CardTitle>
                <CardDescription className="text-slate-600">
                  {quizzes.length} {quizzes.length === 1 ? 'assessment' : 'assessments'} • Manage and administer all created examinations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {quizzes.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className={`inline-flex h-14 w-14 rounded-lg bg-slate-100 items-center justify-center mb-4 ${styles.emptyIcon}`}>
                  <Shield className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-1">No assessments created</h3>
                <p className="text-slate-500 mb-6 max-w-xs mx-auto">
                  Create your first assessment to begin managing student examinations
                </p>
                <Link href="/dashboard/quiz/new">
                  <Button className="bg-[#0F172A] hover:bg-slate-900 text-white">
                    Create Assessment
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={styles.quizTable}>
                {quizzes.map((quiz, idx) => (
                  <div
                    key={quiz.id}
                    className={`flex items-center justify-between p-5 border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors group cursor-pointer ${styles.quizRow}`}
                    style={{animationDelay: `${idx * 50}ms`}}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-slate-100 border border-[#E2E8F0] flex items-center justify-center">
                        <Shield className="h-5 w-5 text-[#0F172A]" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#0F172A] text-base truncate group-hover:text-slate-700 transition-colors">{quiz.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                          <code className="font-mono text-xs bg-slate-50 px-2 py-1 rounded border border-[#E2E8F0] text-slate-700">{quiz.code}</code>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {formatDuration((quiz.settings as any).duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                      {getStatusBadge(quiz.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/quiz/${quiz.id}`} className="cursor-pointer">
                              Edit Assessment
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/quiz/${quiz.id}/roster`} className="cursor-pointer">
                              Manage Roster
                            </Link>
                          </DropdownMenuItem>
                          {quiz.status === 'live' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/quiz/${quiz.id}/monitor`} className="cursor-pointer">
                                <Users className="h-4 w-4 mr-2" strokeWidth={1.5} />
                                Live Monitor
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {quiz.status === 'ended' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/quiz/${quiz.id}/analytics`} className="cursor-pointer">
                                <BarChart3 className="h-4 w-4 mr-2" strokeWidth={1.5} />
                                Results Analysis
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {quiz.status === 'draft' && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={async () => {
                                await supabaseClient
                                  .from('quizzes')
                                  .update({ status: 'live' })
                                  .eq('id', quiz.id)
                                fetchQuizzes()
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" strokeWidth={1.5} />
                              Commence Examination
                            </DropdownMenuItem>
                          )}
                          {quiz.status === 'live' && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={async () => {
                                await supabaseClient
                                  .from('quizzes')
                                  .update({ status: 'ended' })
                                  .eq('id', quiz.id)
                                fetchQuizzes()
                              }}
                            >
                              <Square className="h-4 w-4 mr-2" strokeWidth={1.5} />
                              Conclude Examination
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
