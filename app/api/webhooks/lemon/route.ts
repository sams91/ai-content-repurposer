import { NextRequest, NextResponse } from 'next/server'
import { upsertSubscription } from '@/app/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const eventType = body.event_name

  console.log('🍋 Lemon Squeezy webhook received:', eventType)

  if (eventType === 'subscription_created' || eventType === 'subscription_updated') {
    const sub = body.data.attributes

    await upsertSubscription({
      user_id: sub.customer_id, // or map from your own user_id if you store it differently
      lemon_squeezy_subscription_id: sub.id,
      status: sub.status,
      trial_ends_at: sub.trial_ends_at,
      current_period_ends_at: sub.renews_at,
      variant_id: sub.variant_id,
    })
  }

  if (eventType === 'subscription_cancelled' || eventType === 'subscription_expired') {
    const sub = body.data.attributes
    await upsertSubscription({
      user_id: sub.customer_id,
      lemon_squeezy_subscription_id: sub.id,
      status: sub.status,
      trial_ends_at: null,
      current_period_ends_at: null,
      variant_id: sub.variant_id,
    })
  }

  return NextResponse.json({ received: true })
}