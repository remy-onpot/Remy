'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertCircle, Loader2 } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-[#E2E8F0] shadow-sm">
        <CardHeader className="text-center bg-white border-b border-[#E2E8F0]">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-[#0F172A]" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-2xl font-bold text-[#0F172A]">Lecturer Access</CardTitle>
          <CardDescription className="text-slate-600">
            Sign in to access the assessment management system
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4 border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="lecturer@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#E2E8F0] focus:border-[#10B981]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#E2E8F0] focus:border-[#10B981]"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#0F172A] hover:bg-slate-900 text-white font-semibold" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
