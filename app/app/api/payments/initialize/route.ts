import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!

const TIERS = {
  basic: { amount: 100, tokens: 2, name: 'Basic Allocation' },
  power: { amount: 200, tokens: 2, name: 'Power Allocation' },
  advanced: { amount: 350, tokens: 2, name: 'Advanced Allocation' }
}

export async function POST(req: Request) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tier } = await req.json()
    if (!TIERS[tier as keyof typeof TIERS]) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })

    const selectedTier = TIERS[tier as keyof typeof TIERS]
    const reference = `np_txn_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // 1. Log pending transaction in DB
    await supabaseClient.from('transactions').insert({
      reference,
      lecturer_id: user.id,
      amount: selectedTier.amount,
      tier: tier,
      tokens_granted: selectedTier.tokens,
      status: 'pending'
    })

    // 2. Initialize Paystack
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.email,
        amount: selectedTier.amount * 100, // Paystack uses pesewas/kobo
        reference: reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing/callback`,
        metadata: { lecturer_id: user.id, tier }
      })
    })

    const paystackData = await paystackRes.json()
    if (!paystackData.status) throw new Error(paystackData.message)

    return NextResponse.json({ authorization_url: paystackData.data.authorization_url })

  } catch (error: any) {
    console.error('Payment Init Error:', error)
    return NextResponse.json({ error: 'Failed to initialize transaction' }, { status: 500 })
  }
}