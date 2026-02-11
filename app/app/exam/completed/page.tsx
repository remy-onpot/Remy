'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Home } from 'lucide-react'

export default function ExamCompletedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Exam Submitted!</CardTitle>
          <CardDescription>
            Your exam has been successfully submitted. You can now close this window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button className="gap-2">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
