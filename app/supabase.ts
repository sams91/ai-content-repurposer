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

// ====================== VIDEO HISTORY ======================
export interface VideoHistoryItem {
  id: string
  user_id: string
  video_url: string
  transcription: string
  platforms: any[]
  title?: string
  original_filename?: string
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

export async function getUnifiedHistory(user_id: string) {
  const [textHistory, videoHistory] = await Promise.all([
    loadTextHistory(user_id),
    getVideoHistory(user_id),
  ])

  const combined = [
    ...textHistory.map(item => ({ ...item, type: 'text' as const })),
    ...videoHistory.map(item => ({ ...item, type: 'video' as const })),
  ].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return combined
}