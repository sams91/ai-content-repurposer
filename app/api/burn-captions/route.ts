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

function calculateCaptionSettings(width: number) {
  // Much smaller font as requested (~5/8 size) with generous side padding
  const fontSize = Math.max(14, Math.floor(width / 38));
  const charWidthEstimate = fontSize * 0.68;
  const usableWidth = Math.floor(width * 0.88); 
  const maxCharsPerLine = Math.max(32, Math.floor(usableWidth / charWidthEstimate));
  return { fontSize, maxCharsPerLine };
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text || text.trim() === '') return ['No transcription available'];
  const words = text.trim().split(' ');
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
  return lines.slice(0, 3);
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

    console.log('🚀 Burning captions for:', filename);
    console.log('Caption text length:', text ? text.length : 0);

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download video');

    const arrayBuffer = await videoResponse.arrayBuffer();
    inputPath = path.join(TEMP_DIR, `${uuidv4()}.mp4`);
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    outputPath = path.join(TEMP_DIR, `${uuidv4()}-with-captions.mp4`);

    const videoInfo = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const videoStream = videoInfo.streams.find((s: any) => s.codec_type === 'video');
    const width = videoStream?.width || 720;
    const height = videoStream?.height || 1280;
    console.log(`📐 Video dimensions: ${width}x${height}`);

    const { fontSize, maxCharsPerLine } = calculateCaptionSettings(width);

    const lines = wrapText(text, maxCharsPerLine);
    console.log('Wrapped lines:', lines);
    console.log(`Using fontSize: ${fontSize}, maxCharsPerLine: ${maxCharsPerLine}`);

    // Build multiple drawtext filters - one per line (most reliable, no \n issues)
    const filters: string[] = [];
    const lineHeight = fontSize + 6; // tight but readable
    const totalTextHeight = lines.length * lineHeight;
    let currentY = height - totalTextHeight - 38; // nice bottom padding

    lines.forEach((line, index) => {
      if (line) {
        const escapedLine = line
          .replace(/'/g, "\\'")
          .replace(/:/g, '\\:')
          .replace(/,/g, '\\,');
        
        filters.push(
          `drawtext=fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.8:boxborderw=6:x=(w-text_w)/2:y=${currentY}:text='${escapedLine}'`
        );
        currentY += lineHeight;
      }
    });

    console.log('Number of drawtext filters:', filters.length);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(filters)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-c:a copy',
          '-movflags +faststart'
        ])
        .on('end', resolve)
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    const captionedBuffer = fs.readFileSync(outputPath);

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
      message: 'Captions burned into video successfully'
    });
  } catch (err: any) {
    console.error('Burn captions error:', err);
    return NextResponse.json({ error: err.message || 'Failed to burn captions' }, { status: 500 });
  } finally {
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}