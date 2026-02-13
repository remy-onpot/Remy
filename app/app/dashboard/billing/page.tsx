'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Shield, Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

const TIERS = [
  {
    id: 'basic',
    name: 'Basic Allocation',
    price: '100',
    capacity: '150 Students',
    tokens: 2,
    description: 'Ideal for standard class quizzes and continuous assessment.',
  },
  {
    id: 'power',
    name: 'Power Allocation',
    price: '200',
    capacity: '400 Students',
    tokens: 2,
    description: 'Designed for large lecture halls and combined courses.',
    isPopular: true
  },
  {
    id: 'advanced',
    name: 'Advanced Allocation',
    price: '350',
    capacity: '1,000 Students',
    tokens: 2,
    description: 'Enterprise grade capacity for massive mid-semester exams.',
  }
]

export default function BillingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const handlePurchase = async (tierId: string) => {
    setLoadingTier(tierId)
    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId })
      })
      const data = await res.json()
      
      if (data.authorization_url) {
        window.location.href = data.authorization_url // Redirect to Paystack
      } else {
        throw new Error(data.error || 'Failed to initialize payment')
      }
    } catch (error: any) {
      toast.error('Transaction Initialization Failed', { description: error.message })
      setLoadingTier(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
            <Shield className="h-3 w-3 mr-2" strokeWidth={1.5} /> Secure Infrastructure
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Acquire Assessment Tokens</h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            NimdeQuizzer operates on a prepaid infrastructure. Purchase capacity only when you need it. Each transaction grants two (2) assessment tokens.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 pt-8">
          {TIERS.map((tier) => (
            <Card key={tier.id} className={`relative shadow-sm border-slate-200 transition-all hover:shadow-md ${tier.isPopular ? 'border-emerald-500 shadow-emerald-100' : ''}`}>
              {tier.isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 font-semibold tracking-wide uppercase text-[10px]">Recommended</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl text-slate-800">{tier.name}</CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-slate-900">GH₵{tier.price}</span>
                </div>
                <CardDescription className="pt-2">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
                    <span className="text-sm font-medium text-slate-700">Includes {tier.tokens} Tokens</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
                    <span className="text-sm font-medium text-slate-700">Up to {tier.capacity} per token</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
                    <span className="text-sm font-medium text-slate-700">AI Integrity Shield included</span>
                  </div>
                </div>

                <Button 
                  className={`w-full h-12 font-semibold ${tier.isPopular ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
                  variant={tier.isPopular ? 'default' : 'outline'}
                  onClick={() => handlePurchase(tier.id)}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === tier.id ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing Gateway...</>
                  ) : (
                    <><CreditCard className="mr-2 h-4 w-4" strokeWidth={1.5} /> Procure Allocation</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  )
}