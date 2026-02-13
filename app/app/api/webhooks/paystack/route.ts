import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Use Service Role Key for webhooks because the request comes from Paystack, not an authenticated user
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    // 1. Verify Request Legitimacy (Crucial Security Step)
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(body).digest('hex')
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    // 2. Process Successful Charge
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data
      const lecturer_id = metadata.lecturer_id
      const tier = metadata.tier

      // Check if already processed (Idempotency)
      const { data: txn } = await supabaseAdmin
        .from('transactions')
        .select('status, tokens_granted')
        .eq('reference', reference)
        .single()

      if (txn && txn.status === 'pending') {
        // A. Update Transaction Status
        await supabaseAdmin.from('transactions').update({ status: 'success' }).eq('reference', reference)

        // B. Credit the Wallet securely
        // Using RPC (Remote Procedure Call) is safer for atomic incrementing, but for simplicity we fetch and update
        const { data: wallet } = await supabaseAdmin.from('wallets').select('*').eq('lecturer_id', lecturer_id).single()
        
        if (wallet) {
          const tierColumn = `${tier}_tokens`
          const currentTokens = wallet[tierColumn as keyof typeof wallet] || 0
          
          await supabaseAdmin.from('wallets')
            .update({ [tierColumn]: currentTokens + txn.tokens_granted })
            .eq('lecturer_id', lecturer_id)
        } else {
          // Fallback if wallet doesn't exist yet
          await supabaseAdmin.from('wallets').insert({
            lecturer_id,
            [`${tier}_tokens`]: txn.tokens_granted
          })
        }
      }
    }

    // Always return 200 fast to acknowledge receipt to Paystack
    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 })

  } catch (error) {
    console.error('Webhook Error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}