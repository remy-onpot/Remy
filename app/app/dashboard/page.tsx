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
import { Quiz } from '@/types'
import { formatDuration } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

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
      const { data, error } = await supabaseClient
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuizzes(data || [])
    } catch (error) {
      console.error('Error fetching quizzes:', error)
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
        return <Badge className="bg-green-500">Live</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'ended':
        return <Badge variant="outline">Ended</Badge>
      case 'archived':
        return <Badge variant="destructive">Archived</Badge>
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Midsem</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your exams and monitor students</p>
          </div>
          <Link href="/dashboard/quiz/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                  <p className="text-3xl font-bold">{quizzes.length}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Live Exams</p>
                  <p className="text-3xl font-bold">
                    {quizzes.filter(q => q.status === 'live').length}
                  </p>
                </div>
                <Play className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Drafts</p>
                  <p className="text-3xl font-bold">
                    {quizzes.filter(q => q.status === 'draft').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold">
                    {quizzes.filter(q => q.status === 'ended').length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quizzes List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Quizzes</CardTitle>
            <CardDescription>
              Manage and monitor all your created exams
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first quiz to get started
                </p>
                <Link href="/dashboard/quiz/new">
                  <Button>Create Quiz</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{quiz.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Code: {quiz.code}</span>
                          <span>•</span>
                          <span>{formatDuration((quiz.settings as any).duration)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(quiz.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/quiz/${quiz.id}`}>
                              Edit Quiz
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/quiz/${quiz.id}/roster`}>
                              Manage Roster
                            </Link>
                          </DropdownMenuItem>
                          {quiz.status === 'live' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/quiz/${quiz.id}/monitor`}>
                                <Users className="h-4 w-4 mr-2" />
                                Live Monitor
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {quiz.status === 'ended' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/quiz/${quiz.id}/analytics`}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analytics
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {quiz.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                await supabaseClient
                                  .from('quizzes')
                                  .update({ status: 'live' })
                                  .eq('id', quiz.id)
                                fetchQuizzes()
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Exam
                            </DropdownMenuItem>
                          )}
                          {quiz.status === 'live' && (
                            <DropdownMenuItem
                              onClick={async () => {
                                await supabaseClient
                                  .from('quizzes')
                                  .update({ status: 'ended' })
                                  .eq('id', quiz.id)
                                fetchQuizzes()
                              }}
                            >
                              <Square className="h-4 w-4 mr-2" />
                              End Exam
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
