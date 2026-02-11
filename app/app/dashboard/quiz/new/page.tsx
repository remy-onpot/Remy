'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, Plus, Trash2, Check } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { generateQuizCode } from '@/lib/utils'
import { Question, Option } from '@/types'

export default function NewQuizPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [strictness, setStrictness] = useState<'low' | 'medium' | 'high'>('medium')
  const [shuffle, setShuffle] = useState(true)
  const [questions, setQuestions] = useState<Partial<Question>[]>([
    { type: 'mcq', content: '', points: 1, options: [{ content: '', is_correct: false }, { content: '', is_correct: false }] }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { type: 'mcq', content: '', points: 1, options: [{ content: '', is_correct: false }, { content: '', is_correct: false }] }
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const addOption = (questionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].options = [
      ...(updated[questionIndex].options || []),
      { content: '', is_correct: false }
    ]
    setQuestions(updated)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].options = updated[questionIndex].options?.filter((_, i) => i !== optionIndex)
    setQuestions(updated)
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    const updated = [...questions]
    if (updated[questionIndex].options) {
      updated[questionIndex].options[optionIndex] = {
        ...updated[questionIndex].options[optionIndex],
        [field]: value
      }
    }
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate
      if (!title.trim()) {
        setError('Please enter a quiz title')
        return
      }
      if (questions.length === 0) {
        setError('Please add at least one question')
        return
      }
      for (const q of questions) {
        if (!q.content?.trim()) {
          setError('All questions must have content')
          return
        }
        if (q.type === 'mcq' && (!q.options || q.options.length < 2)) {
          setError('MCQ questions must have at least 2 options')
          return
        }
      }

      // Get current user
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        setError('You must be logged in')
        return
      }

      // Create quiz
      const code = generateQuizCode()
      const { data: quiz, error: quizError } = await supabaseClient
        .from('quizzes')
        .insert({
          lecturer_id: user.id,
          title,
          code,
          settings: {
            duration,
            strictness,
            shuffle,
            allow_review: true,
            auto_submit: true
          },
          status: 'draft'
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Create questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const { data: question, error: questionError } = await supabaseClient
          .from('questions')
          .insert({
            quiz_id: quiz.id,
            type: q.type,
            content: q.content,
            points: q.points || 1,
            position: i
          })
          .select()
          .single()

        if (questionError) throw questionError

        // Create options for MCQ
        if (q.type === 'mcq' && q.options) {
          for (const opt of q.options) {
            const { error: optionError } = await supabaseClient
              .from('options')
              .insert({
                question_id: question.id,
                content: opt.content,
                is_correct: opt.is_correct
              })

            if (optionError) throw optionError
          }
        }
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Create New Quiz</h1>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Quiz Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Quiz Settings</CardTitle>
              <CardDescription>Configure the basic settings for your quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Midterm Examination - Marketing 101"
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    max={180}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strictness">Security Level</Label>
                  <Select value={strictness} onValueChange={(v: any) => setStrictness(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Lenient)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Strict)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Switch checked={shuffle} onCheckedChange={setShuffle} />
                    Shuffle Questions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Randomize question order for each student
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Questions</h2>
              <Button type="button" variant="outline" onClick={addQuestion} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>

            {questions.map((question, qIndex) => (
              <Card key={qIndex}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Content</Label>
                    <Textarea
                      value={question.content}
                      onChange={(e) => updateQuestion(qIndex, 'content', e.target.value)}
                      placeholder="Enter your question here..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={question.type}
                        onValueChange={(v: any) => updateQuestion(qIndex, 'type', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                          <SelectItem value="boolean">True/False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={question.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  {question.type === 'mcq' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(qIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {question.options?.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={option.is_correct ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateOption(qIndex, oIndex, 'is_correct', !option.is_correct)}
                              className="shrink-0"
                            >
                              {option.is_correct && <Check className="h-3 w-3 mr-1" />}
                              Correct
                            </Button>
                            <Input
                              value={option.content}
                              onChange={(e) => updateOption(qIndex, oIndex, 'content', e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                            />
                            {question.options!.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(qIndex, oIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Quiz...
                </>
              ) : (
                'Create Quiz'
              )}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
