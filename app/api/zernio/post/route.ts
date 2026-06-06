import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_LINKEDIN_CHARS = 3800;

type MediaType = 'text' | 'video' | 'audio';

interface MediaConfig {
  mediaUrls: string[];
  media?: Array<{ url: string; type: 'video' | 'audio' }>;
  shouldAttachMedia: boolean;
}

function getMediaConfig(
  mediaType: MediaType,
  platform: string,
  videoUrl?: string | null,
  audioUrl?: string | null
): MediaConfig {
  const targetPlatform = (platform || '').toLowerCase();
  const hasVideo = !!videoUrl;
  const hasAudio = !!audioUrl;

  if (mediaType === 'text' || (!hasVideo && !hasAudio)) {
    return {
      mediaUrls: [],
      media: undefined,
      shouldAttachMedia: false,
    };
  }

  const mediaUrls: string[] = [];
  if (hasVideo && videoUrl) mediaUrls.push(videoUrl);
  if (hasAudio && audioUrl) mediaUrls.push(audioUrl);

  if (mediaUrls.length === 0) {
    return {
      mediaUrls: [],
      media: undefined,
      shouldAttachMedia: false,
    };
  }

  let mediaTypeForPlatform: 'video' | 'audio' = 'video';

  if (mediaType === 'audio' && targetPlatform === 'linkedin') {
    mediaTypeForPlatform = 'video';
  } else if (mediaType === 'audio') {
    mediaTypeForPlatform = 'video';
  } else {
    mediaTypeForPlatform = 'video';
  }

  const media = mediaUrls.map((url) => ({
    url,
    type: mediaTypeForPlatform,
  }));

  return {
    mediaUrls,
    media,
    shouldAttachMedia: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      platform_id,
      content,
      title,
      caption,
      hashtags,
      video_url,
      media_urls: incomingMediaUrls,
      audio_url,
      user_id,
      platform,
    } = await req.json();

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

    let mediaType: MediaType = 'text';
    if (video_url) mediaType = 'video';
    else if (audio_url) mediaType = 'audio';

    let finalContent = caption || content || '';

    // Clean fallback link for audio on LinkedIn
    const targetPlatform = (platform || '').toLowerCase();
    if (mediaType === 'audio' && audio_url && targetPlatform === 'linkedin') {
      const linkText = `\n\n🎧 Listen to the full episode here:\n${audio_url}`;
      if (!finalContent.includes(audio_url)) {
        finalContent = finalContent.trim() + linkText;
      }
    }

    // LinkedIn length handling
    if (finalContent.length > MAX_LINKEDIN_CHARS) {
      console.warn(`⚠️ Content too long (${finalContent.length} chars). Truncating for LinkedIn...`);
      finalContent =
        finalContent.substring(0, 2000) +
        `\n\n[Full episode continued in the original audio/video. This is a condensed version for LinkedIn.]\n\n🔗 Full version: ${video_url || audio_url || 'ContentAmplifier.app'}`;
    }

    const mediaConfig = getMediaConfig(mediaType, platform, video_url, audio_url);

    const postPayload: any = {
      content: finalContent,
      title: title || undefined,
      hashtags: hashtags || undefined,
      platforms: [
        {
          platform: targetPlatform || 'linkedin',
          accountId: platform_id,
        },
      ],
      publishNow: true,
    };

    if (mediaConfig.shouldAttachMedia && mediaConfig.mediaUrls.length > 0) {
      postPayload.media_urls = mediaConfig.mediaUrls;

      if (mediaConfig.media && mediaConfig.media.length > 0) {
        postPayload.media = mediaConfig.media;
      }

      console.log(
        `📎 Attaching media to Zernio: ${mediaConfig.mediaUrls.length} file(s) | type: ${mediaType} | platform: ${targetPlatform}`
      );
    } else {
      console.log(`📝 Text-only post to Zernio | platform: ${targetPlatform}`);
    }

    console.log('📤 Sending to Zernio:', JSON.stringify(postPayload, null, 2));

    const response = await fetch('https://zernio.com/api/v1/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${zernioData.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    const result = await response.json();
    console.log('📥 Zernio raw response:', result);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: result.message || result.error || 'Failed to post',
          details: result,
        },
        { status: response.status }
      );
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