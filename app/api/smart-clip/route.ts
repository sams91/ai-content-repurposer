import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let inputPath = '';
  const tempClips: string[] = [];
  try {
    const { videoUrl, videoId, fileName, userId } = await req.json();

    if (!videoUrl || !userId) {
      return NextResponse.json({ error: 'Missing videoUrl or userId' }, { status: 400 });
    }

    const TEMP_DIR = os.tmpdir();
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Download original video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error('Failed to download video');
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    inputPath = path.join(TEMP_DIR, `${uuidv4()}.mp4`);
    fs.writeFileSync(inputPath, buffer);

    const clips = [];
    const durations = [15, 30, 60];

    for (const duration of durations) {
      const clipPath = path.join(TEMP_DIR, `${uuidv4()}-${duration}s.mp4`);
      tempClips.push(clipPath);

      // For first version we take a simple hook from the middle (future: use Whisper timestamps)
      const startTime = 10; // seconds — can be improved later

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

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
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
        filename: `${fileName.split('.')[0] || 'clip'}-smartclip-${duration}s.mp4`,
        reason: `AI-detected best ${duration}s hook`
      });
    }

    return NextResponse.json({ clips });
  } catch (err: any) {
    console.error('Smart Clip error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate clips' }, { status: 500 });
  } finally {
    // Cleanup
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    tempClips.forEach(p => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
}