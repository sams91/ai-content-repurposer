// app/api/process-scheduled-posts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { markScheduledPostAsPosted } from '../../supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET() {
  try {
    const { data: duePosts, error } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .lte('scheduled_at', new Date().toISOString())
      .eq('status', 'pending');

    if (error) throw error;

    for (const post of duePosts || []) {
      try {
        const item = post.history_item || {};
        console.log(`🔄 Processing scheduled post ${post.id} for ${post.platform}`);

        let content = item.type === 'text' 
          ? item.original_content 
          : (item.transcription || item.file_name || 'Scheduled amplified content');

        const title = item.title || item.original_filename || 'Untitled';
        const caption = item.amplified_outputs?.[post.platform]?.caption || content;
        const hashtags = item.amplified_outputs?.[post.platform]?.hashtags || [];

        const payload = {
          platform_id: post.history_item.zernio_account_id || '',
          platform: post.platform,
          content: content,
          title: title,
          caption: caption,
          hashtags: hashtags,
          video_url: item.video_url || undefined,
          user_id: post.user_id,
        };

        console.log("📤 Sending to Zernio:", JSON.stringify(payload, null, 2));

        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/zernio/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (json.success) {
          await markScheduledPostAsPosted(post.id);
          console.log(`✅ Auto-posted ${post.id} to ${post.platform}`);
        } else {
          console.error(`❌ Failed to post ${post.id}:`, json);
        }
      } catch (postErr) {
        console.error('Error processing scheduled post', postErr);
      }
    }

    return NextResponse.json({ success: true, processed: duePosts?.length || 0 });
  } catch (err) {
    console.error('Scheduler error:', err);
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 });
  }
}