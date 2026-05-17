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

function wrapText(text: string, maxCharsPerLine: number = 65): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  // Max 2 lines for video captions
  return lines.slice(0, 2);
}

export async function POST(req: NextRequest) {
  let inputPath = '';
  let outputPath = '';
  try {
    const { videoUrl, filename, text } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
    }

    fs.mkdirSync(TEMP_DIR, { recursive: true });

    console.log('🔥 Burning captions for:', filename);
    console.log('Caption text length:', text ? text.length : 0);

    // Download original video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download video');

    const arrayBuffer = await videoResponse.arrayBuffer();
    inputPath = path.join(TEMP_DIR, `${uuidv4()}.mp4`);
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    outputPath = path.join(TEMP_DIR, `${uuidv4()}-with-captions.mp4`);

    // Wrap into 2 lines max
    const lines = wrapText(text && text.trim() ? text.trim() : '%{pts\\:hms}');

    // Build two drawtext filters for clean wrapping
    const filters = [];
    if (lines[0]) {
      const escapedLine1 = lines[0].replace(/'/g, "\\'");
      filters.push(`drawtext=fontsize=32:fontcolor=white:box=1:boxcolor=black@0.85:boxborderw=8:x=(w-text_w)/2:y=h-th-90:text='${escapedLine1}'`);
    }
    if (lines[1]) {
      const escapedLine2 = lines[1].replace(/'/g, "\\'");
      filters.push(`drawtext=fontsize=32:fontcolor=white:box=1:boxcolor=black@0.85:boxborderw=8:x=(w-text_w)/2:y=h-th-45:text='${escapedLine2}'`);
    }

    console.log('Using drawtext filters:', filters);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(filters)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k'
        ])
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    const captionedBuffer = fs.readFileSync(outputPath);

    // Upload captioned video
    const captionedFilename = `captioned/${uuidv4()}-${filename || 'clip'}-with-captions.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(captionedFilename, captionedBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(captionedFilename);

    return NextResponse.json({
      success: true,
      captionedUrl: publicUrl,
      message: '✅ Captions burned into video'
    });
  } catch (err: any) {
    console.error('Burn captions error:', err);
    return NextResponse.json({ error: err.message || 'Failed to burn captions' }, { status: 500 });
  } finally {
    // Safe cleanup
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}