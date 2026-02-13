'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase'
import { ExtractedStudent } from '@/lib/services/ai-roster'

// UI Primitives
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Icons
import { ArrowLeft, Users, Loader2, BookOpen, Trash2, Calendar, FileText } from 'lucide-react'
import { toast } from 'sonner'

// Components
import { AiRosterImportModal } from '@/components/roster/AiRosterImportModal'

interface SavedRoster {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null; 
  saved_roster_students: { count: number }[];
}

export default function MasterRostersPage() {
  const [rosters, setRosters] = useState<SavedRoster[]>([])
  const [loading, setLoading] = useState(true)
  
  // Naming Modal State
  const [isNamingOpen, setIsNamingOpen] = useState(false)
  const [pendingStudents, setPendingStudents] = useState<ExtractedStudent[]>([])
  const [rosterName, setRosterName] = useState('')
  const [rosterDesc, setRosterDesc] = useState('')
  const [savingState, setSavingState] = useState(false)

  useEffect(() => {
    fetchRosters()
  }, [])

  const fetchRosters = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) return

      const { data, error } = await supabaseClient
        .from('saved_rosters')
        .select(`
          id, 
          name, 
          description,
          created_at,
          saved_roster_students (count)
        `)
        .eq('lecturer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRosters(data || [])
    } catch (error: any) {
      toast.error('Failed to load rosters', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  // Triggered when the AI successfully extracts the students
  const handleAiExtractionSuccess = (students: ExtractedStudent[]) => {
    setPendingStudents(students)
    setRosterName('') // Reset
    setRosterDesc('')
    setIsNamingOpen(true) // Open the second step: Naming the roster
  }

  const handleSaveMasterRoster = async () => {
    if (!rosterName.trim()) {
      toast.error('Missing Information', { description: 'Please provide a name for this class list.' })
      return
    }

    setSavingState(true)
    try {
      const res = await fetch('/api/roster/save-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rosterName,
          description: rosterDesc,
          students: pendingStudents
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast.success('Roster Saved Successfully', { 
        description: `${data.count} students are now stored in "${rosterName}".` 
      })
      
      setIsNamingOpen(false)
      setPendingStudents([])
      fetchRosters() // Refresh the list
      
    } catch (error: any) {
      toast.error('Save Failed', { description: error.message })
    } finally {
      setSavingState(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return

    try {
      // RLS and ON DELETE CASCADE will handle ensuring only the owner can delete, 
      // and it will clean up the saved_roster_students automatically.
      const { error } = await supabaseClient.from('saved_rosters').delete().eq('id', id)
      if (error) throw error

      toast.success('Roster Deleted', { description: `"${name}" has been removed.` })
      setRosters(rosters.filter(r => r.id !== id))
    } catch (error: any) {
      toast.error('Failed to delete roster', { description: error.message })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
                Dashboard
              </Button>
            </Link>
            <div className="border-l pl-4">
              <h1 className="font-bold text-slate-900 font-heading">Master Rosters</h1>
            </div>
          </div>
          
          <AiRosterImportModal onImportSuccess={handleAiExtractionSuccess} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Your Saved Class Lists</h2>
          <p className="text-slate-500 font-body">Manage your student cohorts. These lists can be imported into any assessment instantly.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : rosters.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-12 w-12 text-slate-300 mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-1">No Rosters Found</h3>
              <p className="text-slate-500 mb-6 max-w-sm">
                You haven't saved any class lists yet. Use the Magic Import button above to paste a list or upload a document.
              </p>
              <AiRosterImportModal onImportSuccess={handleAiExtractionSuccess} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rosters.map((roster) => (
              <Card key={roster.id} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow group">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg text-slate-900 font-heading leading-tight line-clamp-1">
                        {roster.name}
                      </CardTitle>
                      {roster.description && (
                        <CardDescription className="line-clamp-2 text-xs">
                          {roster.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(roster.id, roster.name)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
                      <span className="font-medium text-slate-900">
                        {roster.saved_roster_students[0]?.count || 0}
                      </span> Students
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" strokeWidth={1.5} />
{roster.created_at ? new Date(roster.created_at).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* --- Step 2 Modal: Naming the Roster after AI Extraction --- */}
        <Dialog open={isNamingOpen} onOpenChange={setIsNamingOpen}>
          <DialogContent className="sm:max-w-md border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 font-heading">Save Class List</DialogTitle>
              <DialogDescription>
                The AI successfully verified <strong>{pendingStudents.length}</strong> student records. Name this cohort to save it to your library.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Class Name <span className="text-red-500">*</span></label>
                <Input 
                  placeholder="e.g., MKTG 301 - Marketing Principles" 
                  value={rosterName}
                  onChange={(e) => setRosterName(e.target.value)}
                  className="border-slate-300 focus-visible:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Description (Optional)</label>
                <Input 
                  placeholder="e.g., Level 300 Morning Session" 
                  value={rosterDesc}
                  onChange={(e) => setRosterDesc(e.target.value)}
                  className="border-slate-300 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsNamingOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveMasterRoster} 
                className="bg-slate-900 hover:bg-slate-800 text-white"
                disabled={!rosterName.trim() || savingState}
              >
                {savingState ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" strokeWidth={1.5} />}
                Save Master Roster
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}