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
        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/zernio/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform_id: post.history_item.zernio_account_id || '',
            platform: post.platform,
            content: post.history_item.type === 'text' 
              ? post.history_item.original_content 
              : post.history_item.file_name || 'Scheduled amplified content',
            video_url: post.history_item.video_url,
            user_id: post.user_id,
          }),
        });

        const json = await res.json();
        if (json.success) {
          await markScheduledPostAsPosted(post.id);
          console.log(`✅ Auto-posted scheduled post ${post.id} to ${post.platform}`);
        } else {
          console.error(`Failed to post ${post.id}:`, json.error);
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