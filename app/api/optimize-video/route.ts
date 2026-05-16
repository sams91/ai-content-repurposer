import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEMP_DIR = os.tmpdir();

export async function POST(req: NextRequest) {
  let inputPath = '';
  let outPath = '';
  try {
    const { video_url, platform, user_id } = await req.json();

    if (!video_url || !platform || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure temp folder exists (fixes Windows ENOENT)
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    console.log('🔄 Optimizing for:', platform);

    // Download from public URL
    const videoResponse = await fetch(video_url);
    if (!videoResponse.ok) throw new Error('Failed to download video');

    const arrayBuffer = await videoResponse.arrayBuffer();
    inputPath = path.join(TEMP_DIR, `${uuidv4()}.webm`);
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    // Platform settings
    let width = 1080, height = 1920, bitrate = '2500k';
    if (['youtube', 'linkedin', 'rumble'].includes(platform)) {
      width = 1920; height = 1080; bitrate = '5000k';
    }
    if (['instagram', 'threads'].includes(platform)) {
      width = 1080; height = 1080; bitrate = '3500k';
    }

    outPath = path.join(TEMP_DIR, `${uuidv4()}-${platform}.mp4`);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
          '-c:v libx264',
          `-b:v ${bitrate}`,
          '-preset fast',
          '-c:a aac',
          '-b:a 128k'
        ])
        .on('end', resolve)
        .on('error', reject)
        .save(outPath);
    });

    // Upload optimized MP4
    const optimizedName = `optimized-${uuidv4()}-${platform}.mp4`;
    await supabase.storage.from('videos').upload(optimizedName, fs.readFileSync(outPath), {
      contentType: 'video/mp4',
      upsert: true
    });

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(optimizedName);

    return NextResponse.json({
      success: true,
      optimized_url: publicUrl,
      message: `✅ Optimized for ${platform.toUpperCase()}`
    });
  } catch (err: any) {
    console.error('Optimize error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    // Safe cleanup
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
  }
}