'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Wand2, Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { ExtractedStudent } from '@/lib/services/ai-roster'

interface AiRosterImportModalProps {
  onImportSuccess: (students: ExtractedStudent[]) => void;
}

export function AiRosterImportModal({ onImportSuccess }: AiRosterImportModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'paste' | 'upload'>('paste')
  const [pastedText, setPastedText] = useState('')

  const handleTextSubmit = async () => {
    if (!pastedText.trim()) return;
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('text', pastedText)

      const res = await fetch('/api/roster/extract', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast.success(`Integrity Check Passed`, { description: `Successfully extracted ${data.count} student records.` })
      onImportSuccess(data.students)
      setIsOpen(false)
      setPastedText('')
      
    } catch (error: any) {
      toast.error('Extraction Failed', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/roster/extract', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      toast.success(`Integrity Check Passed`, { description: `Successfully extracted ${data.count} student records.` })
      onImportSuccess(data.students)
      setIsOpen(false)
      
    } catch (error: any) {
      toast.error('Extraction Failed', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-semibold">
          <Wand2 className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
          Magic Import
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl border-slate-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 font-heading">
            Extract Roster Records
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-body">
            Paste messy class lists or upload a document. Our AI will automatically identify and format the index numbers and names into a clean roster.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggles */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMode('paste')}
            className={mode === 'paste' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}
          >
            <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} /> Paste Text
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setMode('upload')}
            className={mode === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}
          >
            <Upload className="h-4 w-4 mr-2" strokeWidth={1.5} /> Upload Document
          </Button>
        </div>

        <div className="mt-4">
          {mode === 'paste' ? (
            <div className="space-y-4">
              <Textarea 
                placeholder="Paste your class list here... (e.g. '1. 10293847 Kwame Mensah A+')"
                className="min-h-[250px] bg-slate-50 border-slate-200 focus:border-emerald-500 font-mono text-sm"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                disabled={loading}
              />
              <Button 
                onClick={handleTextSubmit} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11"
                disabled={!pastedText.trim() || loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2 text-emerald-400" />}
                {loading ? 'Processing Data...' : 'Extract Records'}
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
                  <p className="text-slate-600 font-medium">Extracting records via AI...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" strokeWidth={1.5} />
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Select Document</h3>
                  <p className="text-sm text-slate-500 mb-6">Supports .pdf, .docx, .txt, and .csv</p>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx,.txt,.csv"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                    <Button type="button" variant="outline" className="border-slate-300 text-slate-700">
                      Browse Files
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}