import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEMP_DIR = os.tmpdir();

export async function POST(req: NextRequest) {
  let inputPath = '';
  let framePath = '';
  try {
    const { videoUrl, filename } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
    }

    fs.mkdirSync(TEMP_DIR, { recursive: true });

    console.log('🖼️ Extracting thumbnail frame for:', filename);

    // Download video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download video');

    const arrayBuffer = await videoResponse.arrayBuffer();
    inputPath = path.join(TEMP_DIR, `${uuidv4()}.mp4`);
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    // Extract a clean frame at 10 seconds
    framePath = path.join(TEMP_DIR, `${uuidv4()}-frame.jpg`);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          folder: TEMP_DIR,
          filename: path.basename(framePath),
          timemarks: ['10'],
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const frameBuffer = fs.readFileSync(framePath);

    // Upload the extracted frame as the thumbnail
    const thumbnailFilename = `thumbnails/${uuidv4()}-${filename || 'video'}-thumbnail.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(thumbnailFilename, frameBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(thumbnailFilename);

    return NextResponse.json({
      success: true,
      thumbnailUrl: publicUrl,
      message: '✅ Thumbnail extracted from video'
    });
  } catch (err: any) {
    console.error('Generate thumbnail error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate thumbnail' }, { status: 500 });
  } finally {
    // Safe cleanup
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (framePath && fs.existsSync(framePath)) fs.unlinkSync(framePath);
  }
}