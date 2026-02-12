'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sparkles, Upload, FileText, FileType, Loader2, AlertCircle, Clipboard } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'

interface QuizImportModalProps {
  onQuestionsExtracted: (data: any) => void
}

export function QuizImportModal({ onQuestionsExtracted }: QuizImportModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [pastedText, setPastedText] = useState('')

  // 1. Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF or Word document.')
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      // Get authentication token
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('You must be logged in to use this feature.')
        setIsAnalyzing(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/quiz/extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to analyze document')
      const data = await response.json()
      onQuestionsExtracted(data)
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not read the file. Please try pasting the text instead.')
    } finally {
      setIsAnalyzing(false)
      e.target.value = '' 
    }
  }

  // 2. Handle Paste Text
  const handleTextSubmit = async () => {
    if (!pastedText.trim()) {
      setError('Please paste some text first.')
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      // Get authentication token
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('You must be logged in to use this feature.')
        setIsAnalyzing(false)
        return
      }

      const response = await fetch('/api/quiz/extract', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: pastedText }),
      })

      if (!response.ok) throw new Error('Failed to analyze text')
      const data = await response.json()
      onQuestionsExtracted(data)
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not analyze the text. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          Import Questions
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI Quiz Import
          </DialogTitle>
          <DialogDescription>
            Upload a file or paste text directly. The AI will extract questions automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Custom Tabs */}
        <div className="flex gap-2 border-b border-slate-100 pb-2 mb-4">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              activeTab === 'file' 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              activeTab === 'text' 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Paste Text
          </button>
        </div>

        <div className="space-y-4">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div className="space-y-4">
               {/* Recommendation Alert */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
                <FileType className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">Word/PDF Recommended</p>
                  <p className="text-xs text-blue-700">
                    Works best with standard quiz formats.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 transition-colors relative min-h-[200px]">
                {isAnalyzing ? (
                  <div className="text-center space-y-3">
                     <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                     <p className="text-sm font-medium text-slate-600">Analyzing document...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-indigo-50 p-3 rounded-full mb-3">
                      <Upload className="h-6 w-6 text-indigo-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      Upload File
                    </p>
                    <p className="text-xs text-slate-500 mb-4 text-center">
                      Drag & drop or click to browse<br/>(PDF, DOCX)
                    </p>
                    <input 
                      type="file"
                      accept=".pdf,.doc,.docx,.txt" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'text' && (
            <div className="space-y-4">
               <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex gap-3 items-start">
                <Clipboard className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900">Paste your quiz content</p>
                  <p className="text-xs text-orange-700">
                    Copy directly from any document or website.
                  </p>
                </div>
              </div>

              <Textarea 
                placeholder="1. What is the capital of Ghana?
A) Lagos
B) Accra
C) Nairobi
Answer: B"
                className="min-h-[200px] font-mono text-sm"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />

              <Button 
                onClick={handleTextSubmit} 
                disabled={isAnalyzing || !pastedText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Generate Questions'
                )}
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}