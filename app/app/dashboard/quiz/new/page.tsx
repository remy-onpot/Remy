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
import { ArrowLeft, Loader2, Plus, Trash2, Check, BookOpen, FileText } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { generateQuizCode } from '@/lib/utils'
import { QuestionType } from '@/types'
import { QuizImportModal } from '@/components/quiz/QuizImportModal'

// Updated local type to match your new DB schema
type FormOption = { content: string; is_correct: boolean }
type FormQuestion = {
  type: QuestionType  // Required, always set when creating questions
  content: string
  points: number
  context?: string | null // For Comprehension passages
  sample_answer?: string | null // For Theory grading keys
  options?: FormOption[]
}

export default function NewQuizPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [strictness, setStrictness] = useState<'low' | 'medium' | 'high'>('medium')
  const [shuffle, setShuffle] = useState(true)
  
  // Default state with one empty MCQ
  const [questions, setQuestions] = useState<FormQuestion[]>([
    { type: 'mcq', content: '', points: 1, options: [{ content: '', is_correct: false }, { content: '', is_correct: false }] }
  ])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // --- Handlers ---

  const handleAiImport = (data: any) => {
    if (data.title && !title) setTitle(data.title)
    
    if (data.questions && Array.isArray(data.questions)) {
      const newQuestions = data.questions.map((q: any) => ({
          type: q.type || 'mcq',
          content: q.content,
          points: q.points || 1,
          context: q.context || null,
          sample_answer: q.sample_answer || null,
          // Only map options if they exist, otherwise default to empty for MCQs
          options: q.options || (q.type === 'mcq' ? [{ content: '', is_correct: false }, { content: '', is_correct: false }] : [])
      }))
      
      // If the form was practically empty, replace it. Otherwise append.
      if (questions.length === 1 && !questions[0].content) {
        setQuestions(newQuestions)
      } else {
        setQuestions([...questions, ...newQuestions])
      }
    }
  }

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
      // 1. Basic Validation
      if (!title.trim()) throw new Error('Please enter a quiz title')
      if (questions.length === 0) throw new Error('Please add at least one question')
      
      // 2. Question Validation
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.content?.trim()) throw new Error(`Question ${i + 1}: Content is required`)
        
        // Validation specific to MCQ/Boolean
        if (q.type === 'mcq' || q.type === 'boolean') {
          if (!q.options || q.options.length < 2) {
             throw new Error(`Question ${i + 1}: Must have at least 2 options`)
          }
          const hasCorrect = q.options.some(opt => opt.is_correct)
          if (!hasCorrect) {
             throw new Error(`Question ${i + 1}: Mark at least one option as correct`)
          }
        }
      }

      // 3. Auth Check
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) throw new Error('You must be logged in')

      // 4. Create Quiz
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
      if (!quiz) throw new Error('Failed to create quiz')

      // 5. Create Questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        
       const { data: question, error: questionError } = await supabaseClient
  .from('questions')
  .insert({
    quiz_id: quiz.id,
    type: q.type,
    content: q.content!,
    points: q.points || 1,
    position: i,
    context: q.context || null,
    sample_answer: q.sample_answer || null
  })
  .select()
  .single()

        if (questionError) throw questionError

        // 6. Create Options (Only for MCQ/Boolean)
        if ((q.type === 'mcq' || q.type === 'boolean') && q.options) {
          const optionsToInsert = q.options.map(opt => ({
            question_id: question.id,
            content: opt.content,
            is_correct: opt.is_correct
          }))
          
          const { error: optionError } = await supabaseClient
            .from('options')
            .insert(optionsToInsert)

          if (optionError) throw optionError
        }
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Quiz creation error:', err)
      setError(err.message || 'Failed to create quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-[#0F172A]">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-[#0F172A]">Create Assessment</h1>
            <QuizImportModal onQuestionsExtracted={handleAiImport} />
        </div>

        {error && (
          <Alert className="mb-6 border-red-300 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Assessment Settings */}
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-[#0F172A]">Assessment Settings</CardTitle>
              <CardDescription className="text-slate-600">Configure duration, security level, and question options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[#0F172A] font-semibold">Assessment Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., CS 301 Midterm - Data Structures"
                  className="border-[#E2E8F0] focus:border-[#10B981]"
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
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strictness">Security Level</Label>
                  <Select value={strictness} onValueChange={(v: any) => setStrictness(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Lenient)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Strict)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-8">
                  <Label className="flex items-center gap-2">
                    <Switch checked={shuffle} onCheckedChange={setShuffle} />
                    Shuffle Questions
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Questions</h2>
              <Button type="button" variant="outline" onClick={addQuestion} className="gap-2">
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </div>

            {questions.map((question, qIndex) => (
              <Card key={qIndex} className={question.context ? "border-l-4 border-l-indigo-500" : ""}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                        {question.context && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">Linked to Passage</span>}
                    </div>
                    {questions.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* COMPREHENSION: Reading Passage Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Reading Passage / Context (Optional)</Label>
                         {/* Toggle visibility of context field if you want to add it manually */}
                         {!question.context && (
                             <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => updateQuestion(qIndex, 'context', ' ')}>
                                <BookOpen className="h-3 w-3 mr-1" /> Add Passage
                             </Button>
                         )}
                    </div>
                    {question.context !== null && question.context !== undefined && (
                        <Textarea 
                            value={question.context}
                            onChange={(e) => updateQuestion(qIndex, 'context', e.target.value)}
                            placeholder="Paste the reading passage here..."
                            className="bg-slate-50 border-indigo-200 min-h-[100px] text-sm"
                        />
                    )}
                  </div>

                  {/* Main Question Content */}
                  <div className="space-y-2">
                    <Label>Question Content</Label>
                    <Textarea
                      value={question.content}
                      onChange={(e) => updateQuestion(qIndex, 'content', e.target.value)}
                      placeholder="Enter the question..."
                      rows={2}
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select value={question.type} onValueChange={(v: any) => updateQuestion(qIndex, 'type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">Multiple Choice</SelectItem>
                          <SelectItem value="boolean">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer (One Word)</SelectItem>
                          <SelectItem value="long_answer">Theory / Essay</SelectItem>
                          <SelectItem value="comprehension">Comprehension</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min={1}
                        value={question.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* LOGIC BRANCHING: Options vs. Theory Answer */}
                  
                  {/* CASE A: Theory / Essay / Comprehension -> Show Sample Answer */}
                  {(question.type === 'long_answer' || question.type === 'comprehension') && (
                     <div className="space-y-2 pt-2">
                        <Label className="flex items-center gap-2 text-green-700">
                            <FileText className="h-4 w-4" />
                            Sample Answer / Grading Key
                        </Label>
                        <Textarea 
                            value={question.sample_answer || ''}
                            onChange={(e) => updateQuestion(qIndex, 'sample_answer', e.target.value)}
                            placeholder="Enter the correct answer or key points for grading..."
                            className="bg-green-50/30 border-green-200 min-h-[80px]"
                        />
                        <p className="text-xs text-muted-foreground">Visible only to you (the lecturer) for grading purposes.</p>
                     </div>
                  )}

                  {/* CASE B: MCQ / Boolean -> Show Options */}
                  {(question.type === 'mcq' || question.type === 'boolean') && (
                    <div className="space-y-2 border-t pt-4 mt-2">
                      <div className="flex items-center justify-between">
                        <Label>Answer Options</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                          <Plus className="h-3 w-3 mr-1" /> Add Option
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
                              className={`shrink-0 ${option.is_correct ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            >
                              {option.is_correct && <Check className="h-3 w-3 mr-1" />}
                              {option.is_correct ? 'Correct' : 'Mark Correct'}
                            </Button>
                            <Input
                              value={option.content}
                              onChange={(e) => updateOption(qIndex, oIndex, 'content', e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(qIndex, oIndex)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
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
            <Button type="submit" className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} /> Creating Assessment...
                </>
              ) : 'Create Assessment'}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline" className="border-[#E2E8F0] text-[#0F172A]">Cancel</Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}