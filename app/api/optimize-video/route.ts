import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const TEMP_DIR = os.tmpdir();

export async function POST(req: NextRequest) {
  let inputPath = '';
  let outPath = '';
  try {
    const { videoUrl, platform, originalFileName } = await req.json();

    if (!videoUrl || !platform) {
      return NextResponse.json({ error: 'Missing videoUrl or platform' }, { status: 400 });
    }

    // Ensure temp folder exists (fixes Windows ENOENT)
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    console.log('🔄 Optimizing for:', platform, '→', originalFileName);

    // Download from public URL
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download video');

    const arrayBuffer = await videoResponse.arrayBuffer();
    inputPath = path.join(TEMP_DIR, `${uuidv4()}.webm`);
    fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

    // Platform settings
    let width = 1080, height = 1920, bitrate = '2500k';
    if (['youtube', 'linkedin', 'rumble'].includes(platform.toLowerCase())) {
      width = 1920; height = 1080; bitrate = '5000k';
    }
    if (['instagram', 'threads'].includes(platform.toLowerCase())) {
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

    // Read the optimized file and send as direct download
    const optimizedBuffer = fs.readFileSync(outPath);

    const downloadName = originalFileName 
      ? `${originalFileName.split('.')[0]}-${platform.toLowerCase()}.mp4`
      : `optimized-${platform.toLowerCase()}.mp4`;

    return new NextResponse(optimizedBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
      },
    });
  } catch (err: any) {
    console.error('Optimize error:', err);
    return NextResponse.json({ error: err.message || 'Optimization failed' }, { status: 500 });
  } finally {
    // Safe cleanup
    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
  }
}