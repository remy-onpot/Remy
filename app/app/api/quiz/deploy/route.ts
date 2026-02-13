import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { quizId } = await req.json()

    // 1. Verify Ownership & Current Status
    const { data: quiz } = await supabaseClient
      .from('quizzes')
      .select('lecturer_id, status')
      .eq('id', quizId)
      .single()

    if (!quiz || quiz.lecturer_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    if (quiz.status !== 'draft') {
      return NextResponse.json({ error: 'Assessment is already deployed' }, { status: 400 })
    }

    // 2. SERVER-SIDE COUNT: Never trust the client's roster count
    const { count: rosterCount, error: countError } = await supabaseClient
      .from('roster')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quizId)

    if (countError || rosterCount === null) throw new Error('Failed to verify roster capacity')

    // 3. SERVER-SIDE TIER CALCULATION (Includes the 10% Grace Buffer)
    let requiredTier: 'basic' | 'power' | 'advanced' = 'basic'
    if (rosterCount > 165) requiredTier = 'power'     // 150 + 10% buffer
    if (rosterCount > 440) requiredTier = 'advanced'  // 400 + 10% buffer
    if (rosterCount > 1100) return NextResponse.json({ error: 'Maximum system capacity exceeded (1,000)' }, { status: 400 })

    // 4. Check Wallet Balance
    const { data: wallet } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('lecturer_id', user.id)
      .single()

    if (!wallet) return NextResponse.json({ error: 'Wallet not found. Please initialize billing.' }, { status: 400 })

    const tokenColumn = `${requiredTier}_tokens` as keyof typeof wallet
    const availableTokens = (wallet[tokenColumn] as number) || 0

    if (availableTokens < 1) {
      return NextResponse.json({ 
        error: 'Insufficient tokens', 
        requiredTier, 
        rosterCount 
      }, { status: 402 }) // 402 Payment Required
    }

    // 5. ATOMIC DEDUCTION & DEPLOYMENT
    // Deduct token from wallet
    const { error: walletUpdateError } = await supabaseClient
      .from('wallets')
      .update({ [tokenColumn]: availableTokens - 1 })
      .eq('lecturer_id', user.id)

    if (walletUpdateError) throw new Error('Failed to deduct token')

    // Activate the Quiz
    const { error: quizUpdateError } = await supabaseClient
      .from('quizzes')
      .update({ 
        status: 'live', 
        token_tier_used: requiredTier 
      })
      .eq('id', quizId)

    if (quizUpdateError) {
      // Rollback token if quiz activation fails (Critical for trust)
      await supabaseClient.from('wallets').update({ [tokenColumn]: availableTokens }).eq('lecturer_id', user.id)
      throw new Error('Failed to deploy assessment. Token refunded.')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Integrity Shield Active. Assessment Deployed.',
      tierUsed: requiredTier
    }, { status: 200 })

  } catch (error: any) {
    console.error('Deployment Error:', error)
    return NextResponse.json({ error: 'Internal system error during deployment' }, { status: 500 })
  }
}