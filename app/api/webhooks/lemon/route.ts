import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { upsertSubscription, grantTrialAccess } from '@/app/supabase'

const LEMON_SQUEEZY_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') || ''

  const hmac = crypto.createHmac('sha256', LEMON_SQUEEZY_WEBHOOK_SECRET)
  hmac.update(rawBody)
  const expectedSignature = hmac.digest('hex')

  if (signature !== expectedSignature) {
    console.error('❌ Invalid Lemon Squeezy webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    console.error('❌ Invalid JSON in webhook')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = body.event_name
  console.log('🍋 Lemon Squeezy webhook received:', eventType, body.data?.id)

  const sub = body.data?.attributes || {}
  const metadata = sub.metadata || sub.custom_data || {}
  const userIdFromMetadata = metadata.user_id || sub.customer_id || sub.user_id

  if (!userIdFromMetadata) {
    console.warn('⚠️ No user_id found in webhook metadata — skipping upsert')
    return NextResponse.json({ received: true })
  }

  if (eventType === 'subscription_created' || eventType === 'subscription_updated' || eventType === 'subscription_payment_succeeded') {
    await upsertSubscription({
      user_id: userIdFromMetadata,
      lemon_squeezy_subscription_id: sub.id,
      status: sub.status as any,
      trial_ends_at: sub.trial_ends_at || null,
      current_period_ends_at: sub.renews_at || sub.current_period_ends_at || null,
      variant_id: sub.variant_id?.toString() || null,
    })
    console.log(`✅ Subscription ${sub.id} synced for user ${userIdFromMetadata}`)
  }

  if (eventType === 'subscription_cancelled' || eventType === 'subscription_expired' || eventType === 'subscription_paused' || eventType === 'subscription_payment_failed') {
    await upsertSubscription({
      user_id: userIdFromMetadata,
      lemon_squeezy_subscription_id: sub.id,
      status: sub.status as any,
      trial_ends_at: null,
      current_period_ends_at: null,
      variant_id: sub.variant_id?.toString() || null,
    })
    console.log(`✅ Subscription ${sub.id} cancelled/expired for user ${userIdFromMetadata}`)
  }

  // Extra safety: if somehow no subscription row exists yet, grant trial
  if (eventType === 'subscription_created' && sub.status === 'trialing') {
    await grantTrialAccess(userIdFromMetadata)
  }

  return NextResponse.json({ received: true })
}