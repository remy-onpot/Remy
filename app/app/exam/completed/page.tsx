'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Home } from 'lucide-react'

export default function ExamCompletedPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-[#10B981]" strokeWidth={1.5} />
            </div>
          </div>
          <CardTitle className="text-2xl text-[#0F172A]">Assessment Submitted</CardTitle>
          <CardDescription className="text-slate-600 pt-2">
            Your assessment has been successfully submitted. A copy has been saved to your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button className="gap-2 bg-[#10B981] hover:bg-[#059669] text-white w-full">
              <Home className="h-4 w-4" strokeWidth={1.5} />
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
