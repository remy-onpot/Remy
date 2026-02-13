'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseClient } from '@/lib/supabase'

interface ImportSavedRosterModalProps {
  quizId: string;
  onImportSuccess: () => void;
}

export function ImportSavedRosterModal({ quizId, onImportSuccess }: ImportSavedRosterModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savedRosters, setSavedRosters] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [fetching, setFetching] = useState(false)

  // Fetch the lecturer's saved rosters when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSavedRosters()
    }
  }, [isOpen])

  const fetchSavedRosters = async () => {
    setFetching(true)
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return

    // Get rosters and count how many students are in each
    const { data, error } = await supabaseClient
      .from('saved_rosters')
      .select(`
        id, 
        name, 
        saved_roster_students (count)
      `)
      .eq('lecturer_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSavedRosters(data)
    }
    setFetching(false)
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleImport = async () => {
    if (selectedIds.length === 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/quiz/roster/import-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, savedRosterIds: selectedIds })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast.success(`Successfully imported ${data.importedCount} unique students.`)
      setIsOpen(false)
      setSelectedIds([])
      onImportSuccess() // Refresh the page's data
      
    } catch (error: any) {
      toast.error('Import Failed', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <BookOpen className="h-4 w-4" />
          Import Saved Class
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Import Master Roster</DialogTitle>
          <DialogDescription>
            Select one or multiple saved classes. The system will combine them and automatically remove any duplicate students.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {fetching ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : savedRosters.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100">
              <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No saved rosters found.</p>
              <p className="text-xs text-slate-400 mt-1">Create master lists from your main dashboard.</p>
            </div>
          ) : (
            savedRosters.map((roster) => (
              <div 
                key={roster.id} 
                className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${selectedIds.includes(roster.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
                onClick={() => toggleSelection(roster.id)}
              >
                <Checkbox 
                  checked={selectedIds.includes(roster.id)} 
                  onCheckedChange={() => toggleSelection(roster.id)}
                />
                <div className="flex-1 leading-none">
                  <p className="font-medium text-sm text-slate-800">{roster.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {roster.saved_roster_students[0]?.count || 0} students
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-xs text-slate-500 self-center">
            {selectedIds.length} roster(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button 
              className="bg-slate-900 text-white hover:bg-slate-800" 
              onClick={handleImport}
              disabled={selectedIds.length === 0 || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Combine & Import
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}