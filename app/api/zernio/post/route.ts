import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_LINKEDIN_CHARS = 3800;

export async function POST(req: NextRequest) {
  try {
    const { platform_id, content, title, caption, hashtags, video_url, media_urls: incomingMediaUrls, audio_url, user_id, platform } = await req.json();

    if (!user_id || !platform_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: zernioData } = await supabase
      .from('user_zernio')
      .select('api_key')
      .eq('user_id', user_id)
      .single();

    if (!zernioData?.api_key) {
      return NextResponse.json({ error: 'Zernio API key not found' }, { status: 400 });
    }

    let finalContent = caption || content || '';
    if (finalContent.length > MAX_LINKEDIN_CHARS) {
      console.warn(`⚠️ Content too long (${finalContent.length} chars). Truncating/summarizing for LinkedIn...`);
      finalContent = finalContent.substring(0, 2000) + 
        `\n\n[Full episode continued in the original audio/video. This is a condensed version for LinkedIn.]\n\n🔗 Full version: ${video_url || audio_url || 'ContentAmplifier.app'}`;
    }

    const finalMediaUrls = incomingMediaUrls || 
                          (video_url ? [video_url] : []) || 
                          (audio_url ? [audio_url] : []);

    const postPayload: any = {
      content: finalContent,
      title: title || undefined,
      hashtags: hashtags || undefined,
      platforms: [
        {
          platform: (platform || 'linkedin').toLowerCase(),
          accountId: platform_id,
        }
      ],
      publishNow: true,
    };

    if (finalMediaUrls.length > 0) {
      postPayload.media_urls = finalMediaUrls;
      // Also try media array with type for better LinkedIn audio support
      postPayload.media = finalMediaUrls.map((url: string) => ({
        url,
        type: audio_url ? 'audio' : 'video'
      }));
      console.log(`📎 Attaching media to Zernio: ${finalMediaUrls.length} file(s) - audio: ${!!audio_url}`);
    }

    console.log("📤 Sending to Zernio:", JSON.stringify(postPayload, null, 2));

    const response = await fetch('https://zernio.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${zernioData.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    const result = await response.json();
    console.log("📥 Zernio raw response:", result);

    if (!response.ok) {
      return NextResponse.json({
        error: result.message || result.error || 'Failed to post',
        details: result
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: `✅ Successfully posted to Zernio and published!`,
    });

  } catch (err: any) {
    console.error('Zernio post error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}