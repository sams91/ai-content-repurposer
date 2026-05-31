import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { upsertSubscription } from '@/app/supabase'

const LEMON_SQUEEZY_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') || ''

  // Verify webhook signature (mandatory for production)
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
  console.log('🍋 Lemon Squeezy webhook received:', eventType)

  if (eventType === 'subscription_created' || eventType === 'subscription_updated') {
    const sub = body.data.attributes
    const metadata = sub.metadata || {} // or sub.custom_data if Lemon uses that

    const userIdFromMetadata = metadata.user_id || sub.customer_id // fallback safety

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

  if (eventType === 'subscription_cancelled' || eventType === 'subscription_expired' || eventType === 'subscription_paused') {
    const sub = body.data.attributes
    const metadata = sub.metadata || {}

    await upsertSubscription({
      user_id: metadata.user_id || sub.customer_id,
      lemon_squeezy_subscription_id: sub.id,
      status: sub.status as any,
      trial_ends_at: null,
      current_period_ends_at: null,
      variant_id: sub.variant_id?.toString() || null,
    })
    console.log(`✅ Subscription ${sub.id} cancelled/expired`)
  }

  return NextResponse.json({ received: true })
}