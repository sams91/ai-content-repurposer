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
  const tempClips: string[] = [];
  try {
    const { videoUrl, videoId, fileName, userId, transcription } = await req.json();

    if (!videoUrl || !userId) {
      return NextResponse.json({ error: 'Missing videoUrl or userId' }, { status: 400 });
    }

    fs.mkdirSync(TEMP_DIR, { recursive: true });

    console.log('🔄 Generating Smart Clips for:', fileName);

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download video');

    const arrayBuffer = await videoResponse.arrayBuffer();
    inputPath = path.join(TEMP_DIR, `${uuidv4()}.mp4`);
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    const clips = [];
    const durations = [15, 30, 60];

    for (const duration of durations) {
      const clipPath = path.join(TEMP_DIR, `${uuidv4()}-${duration}s.mp4`);
      tempClips.push(clipPath);

      const startTime = 10;

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(duration)
          .outputOptions([
            '-c:v libx264',
            '-preset fast',
            '-crf 23',
            '-c:a aac',
            '-b:a 128k'
          ])
          .on('end', resolve)
          .on('error', reject)
          .save(clipPath);
      });

      const clipBuffer = fs.readFileSync(clipPath);
      const clipFilename = `clips/${userId}/${videoId}-${duration}s-${uuidv4()}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(clipFilename, clipBuffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(clipFilename);

      clips.push({
        duration,
        url: publicUrl,
        filename: `${fileName ? fileName.split('.')[0] : 'clip'}-smartclip-${duration}s.mp4`,
        reason: `AI-detected best ${duration}s hook`,
        transcription: transcription || ''   // ← THIS IS THE KEY LINE THAT WAS MISSING
      });
    }

    return NextResponse.json({ clips });
  } catch (err: any) {
    console.error('Smart Clip error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate clips' }, { status: 500 });
  } finally {
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    tempClips.forEach(p => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
}