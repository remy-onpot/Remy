'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Trash2, 
  Download,
  Loader2,
  Users
} from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'
import { RosterEntry, Quiz } from '@/types'
import { parseCSV, downloadCSV } from '@/lib/utils'
import { toast } from 'sonner'

interface RosterPageProps {
  params: { id: string }
}

export default function RosterPage({ params }: RosterPageProps) {
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [newIndexNumber, setNewIndexNumber] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [csvText, setCsvText] = useState('')
  const [showCsvInput, setShowCsvInput] = useState(false)

  const quizId = params.id

  useEffect(() => {
    loadData()
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

      // Get roster
      const { data: rosterData } = await supabaseClient
        .from('roster')
        .select('*')
        .eq('quiz_id', quizId)
        .order('student_name')

      if (rosterData) {
        setRoster(rosterData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async () => {
    if (!newIndexNumber.trim() || !newStudentName.trim()) {
      toast.error('Please enter both index number and name')
      return
    }

    try {
      const { error } = await supabaseClient
        .from('roster')
        .insert({
          quiz_id: quizId,
          index_number: newIndexNumber.trim(),
          student_name: newStudentName.trim(),
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Student with this index number already exists')
        } else {
          throw error
        }
        return
      }

      toast.success('Student added')
      setNewIndexNumber('')
      setNewStudentName('')
      loadData()
    } catch (error) {
      toast.error('Failed to add student')
    }
  }

  const handleRemoveStudent = async (indexNumber: string) => {
    if (!confirm('Are you sure you want to remove this student?')) {
      return
    }

    try {
      const { error } = await supabaseClient
        .from('roster')
        .delete()
        .eq('quiz_id', quizId)
        .eq('index_number', indexNumber)

      if (error) throw error

      toast.success('Student removed')
      loadData()
    } catch (error) {
      toast.error('Failed to remove student')
    }
  }

  const handleCsvUpload = async () => {
    if (!csvText.trim()) {
      toast.error('Please enter CSV data')
      return
    }

    try {
      const students = parseCSV(csvText)
      
      if (students.length === 0) {
        toast.error('No valid students found in CSV')
        return
      }

      let added = 0
      let failed = 0

      for (const student of students) {
        const { error } = await supabaseClient
          .from('roster')
          .insert({
            quiz_id: quizId,
            index_number: student.index_number,
            student_name: student.student_name,
          })

        if (error) {
          failed++
        } else {
          added++
        }
      }

      toast.success(`Added ${added} students${failed > 0 ? `, ${failed} failed` : ''}`)
      setCsvText('')
      setShowCsvInput(false)
      loadData()
    } catch (error) {
      toast.error('Failed to parse CSV')
    }
  }

  const handleDownloadTemplate = () => {
    downloadCSV(
      [{ index_number: '20240001', student_name: 'John Doe' }],
      'roster_template.csv'
    )
  }

  const handleExportRoster = () => {
    downloadCSV(roster, `roster_${quiz?.code}.csv`)
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
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manage Roster</h1>
            <p className="text-muted-foreground">{quiz?.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportRoster}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Add Student */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Student</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="index" className="sr-only">Index Number</Label>
                <Input
                  id="index"
                  placeholder="Index Number"
                  value={newIndexNumber}
                  onChange={(e) => setNewIndexNumber(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="name" className="sr-only">Student Name</Label>
                <Input
                  id="name"
                  placeholder="Student Name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>
              <Button onClick={handleAddStudent}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CSV Upload */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bulk Upload</CardTitle>
                <CardDescription>
                  Upload multiple students via CSV
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCsvInput ? (
              <div className="space-y-4">
                <textarea
                  className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                  placeholder="index_number,student_name&#10;20240001,John Doe&#10;20240002,Jane Smith"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCsvUpload}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <Button variant="outline" onClick={() => setShowCsvInput(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowCsvInput(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Roster List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({roster.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roster.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No students yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add students individually or upload a CSV file
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Index Number</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((entry) => (
                    <TableRow key={entry.index_number}>
                      <TableCell className="font-mono">{entry.index_number}</TableCell>
                      <TableCell>{entry.student_name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStudent(entry.index_number)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
