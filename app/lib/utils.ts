import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateQuizCode(): string {
  const prefix = 'MID'
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${random}`
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function generateDeviceFingerprint(): string {
  const userAgent = navigator.userAgent
  const platform = navigator.platform
  const screenRes = `${screen.width}x${screen.height}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  
  const fingerprint = `${userAgent}|${platform}|${screenRes}|${timezone}`
  return btoa(fingerprint).slice(0, 32)
}

export function calculateScore(
  answers: { question_id: string; selected_option_id?: string; text_response?: string }[],
  questions: { id: string; options?: { id: string; is_correct: boolean }[]; points: number }[]
): number {
  let totalScore = 0
  
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.question_id)
    if (!question) continue
    
    if (question.options && answer.selected_option_id) {
      const selectedOption = question.options.find(o => o.id === answer.selected_option_id)
      if (selectedOption?.is_correct) {
        totalScore += question.points
      }
    }
  }
  
  return totalScore
}

export function encryptProofString(
  answers: Record<string, string>,
  timestamp: number,
  sessionId: string
): string {
  const data = JSON.stringify({ answers, timestamp, sessionId })
  return btoa(data)
}

export function decryptProofString(proofString: string): {
  answers: Record<string, string>
  timestamp: number
  sessionId: string
} {
  const decoded = atob(proofString)
  return JSON.parse(decoded)
}

export function validateIndexNumber(indexNumber: string): boolean {
  // Basic validation - can be customized based on requirements
  return /^[A-Za-z0-9-]+$/.test(indexNumber) && indexNumber.length >= 5
}

export function parseCSV(csvText: string): { index_number: string; student_name: string }[] {
  const lines = csvText.trim().split('\n')
  const results: { index_number: string; student_name: string }[] = []
  
  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('index') ? 1 : 0
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const parts = line.split(',').map(p => p.trim())
    if (parts.length >= 2) {
      results.push({
        index_number: parts[0],
        student_name: parts[1]
      })
    }
  }
  
  return results
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const value = row[h]
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`
      }
      return value
    }).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
