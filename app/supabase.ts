// app/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ====================== TEXT HISTORY ======================
export async function loadTextHistory(user_id: string) {
  const { data, error } = await supabase
    .from('content_history')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })

  if (error) console.error('Error loading text history:', error)
  return data || []
}

// ====================== MEDIA HISTORY (Video + Audio) ======================
export interface VideoHistoryItem {
  id: string
  user_id: string
  video_url: string
  transcription: string
  platforms?: any[]
  amplified_outputs?: any
  title?: string
  original_filename?: string
  file_name?: string
  thumbnail_url?: string
  created_at: string
  updated_at?: string
}

export async function saveVideoToHistory({
  user_id,
  video_url,
  transcription,
  platforms,
  title,
  original_filename,
  thumbnail_url,
}: {
  user_id: string
  video_url: string
  transcription: string
  platforms: any[]
  title?: string
  original_filename?: string
  thumbnail_url?: string
}) {
  const { data, error } = await supabase
    .from('video_history')
    .insert({
      user_id,
      video_url,
      transcription,
      platforms: platforms || [],
      title: title || 'Untitled Video',
      original_filename,
      thumbnail_url,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving video history:', error)
    return null
  }
  return data
}

export async function getVideoHistory(user_id: string): Promise<VideoHistoryItem[]> {
  const { data, error } = await supabase
    .from('video_history')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })

  if (error) console.error('Error loading video history:', error)
  return (data as VideoHistoryItem[]) || []
}

export function getItemType(item: any): 'text' | 'video' | 'audio' {
  if (item.type) return item.type

  const filename = (item.file_name || item.original_filename || item.video_url || '').toLowerCase()
  const url = item.video_url || ''

  if (
    url.includes('audio-uploads') ||
    filename.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i)
  ) {
    return 'audio'
  }

  return 'video'
}

export async function getUnifiedHistory(user_id: string) {
  const [textHistory, mediaHistory] = await Promise.all([
    loadTextHistory(user_id),
    getVideoHistory(user_id),
  ])

  const combined = [
    ...textHistory.map(item => ({ ...item, type: 'text' as const })),
    ...mediaHistory.map(item => ({ ...item, type: getItemType(item) })),
  ].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return combined
}

// ====================== SCHEDULED POSTS ======================
export interface ScheduledPostDB {
  id: string
  user_id: string
  history_item: any
  scheduled_at: string
  platform: string
  status: 'pending' | 'posted' | 'failed'
  created_at: string
}

export async function saveScheduledPost({
  user_id,
  history_item,
  scheduled_at,
  platform,
}: {
  user_id: string
  history_item: any
  scheduled_at: string
  platform: string
}) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      user_id,
      history_item,
      scheduled_at,
      platform,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving scheduled post:', error)
    throw error
  }
  return data
}

export async function loadScheduledPosts(user_id: string) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('user_id', user_id)
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.error('Error loading scheduled posts:', error)
    return []
  }
  return data || []
}

export async function markScheduledPostAsPosted(id: string) {
  const { error } = await supabase
    .from('scheduled_posts')
    .update({ status: 'posted' })
    .eq('id', id)
  if (error) console.error('Error marking post as posted:', error)
}

export async function deleteScheduledPost(id: string) {
  const { error } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', id)
  if (error) console.error('Error deleting scheduled post:', error)
}

// ====================== NEW: SUBSCRIPTION + TRIAL HELPERS ======================
export interface SubscriptionStatus {
  id: string
  user_id: string
  lemon_squeezy_subscription_id: string
  status: 'active' | 'trialing' | 'paused' | 'cancelled' | 'expired'
  trial_ends_at: string | null
  current_period_ends_at: string | null
  variant_id: string
  created_at: string
  updated_at: string
}

export async function getSubscriptionStatus(user_id: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (error || !data) return null
  return data as SubscriptionStatus
}

export async function hasActiveAccess(user_id: string): Promise<boolean> {
  const sub = await getSubscriptionStatus(user_id)
  if (!sub) return false

  const now = new Date()
  const trialEnds = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
  const periodEnds = sub.current_period_ends_at ? new Date(sub.current_period_ends_at) : null

  if (sub.status === 'trialing' && trialEnds && trialEnds > now) return true
  if (sub.status === 'active' && periodEnds && periodEnds > now) return true

  return false
}

export async function upsertSubscription(subscriptionData: any) {
  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'lemon_squeezy_subscription_id' })

  if (error) console.error('Error upserting subscription:', error)
}