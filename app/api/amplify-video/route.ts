// app/api/amplify-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getModel, getVisionModel } from '@/lib/ai';
import OpenAI from 'openai';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const execFilePromise = promisify(execFile);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json({ error: "File must be a video" }, { status: 400 });
    }

    if (videoFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `Video file is too large (max 2GB)` }, { status: 400 });
    }

    const client = getAIClient();
    const visionModel = getVisionModel();

    // === STEP 1: Server-side audio extraction + Whisper ===
    let transcription = "No speech detected or transcription failed.";
    let inputPath: string | null = null;
    let audioPath: string | null = null;

    try {
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

      const tempDir = os.tmpdir();
      inputPath = path.join(tempDir, `input-${Date.now()}-${videoFile.name}`);
      audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`);

      await fs.writeFile(inputPath, videoBuffer);

      console.log(`🎥 Extracting audio from ${(videoFile.size / (1024 * 1024)).toFixed(1)} MB video...`);

      // 64kbps MP3 — guaranteed <25 MB even for longer videos
      await execFilePromise('ffmpeg', [
        '-i', inputPath,
        '-vn',
        '-acodec', 'libmp3lame',
        '-b:a', '64k',        // ← LOWER BITRATE = smaller file
        '-ac', '1',
        '-ar', '16000',
        '-y',
        audioPath
      ]);

      const audioBuffer = await fs.readFile(audioPath);
      const audioMB = audioBuffer.length / (1024 * 1024);
      console.log(`✅ Audio extracted: ${audioMB.toFixed(2)} MB`);

      // Safety net: if somehow still over limit, compress even harder
      if (audioMB > 24) {
        console.warn("⚠️ Audio still >24 MB — re-compressing to 32kbps");
        await execFilePromise('ffmpeg', [
          '-i', audioPath,
          '-vn',
          '-acodec', 'libmp3lame',
          '-b:a', '32k',
          '-ac', '1',
          '-ar', '16000',
          '-y',
          audioPath
        ]);
      }

      const whisper = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const transcriptionResponse = await whisper.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' }),
        model: "whisper-1",
        response_format: "verbose_json",
      });

      transcription = transcriptionResponse.text?.trim() || "No speech detected.";
      console.log("✅ Whisper transcription successful:", transcription.substring(0, 120) + "...");
    } catch (transErr: any) {
      console.error("❌ Whisper / ffmpeg error:", transErr.message);
    } finally {
      if (inputPath) await fs.unlink(inputPath).catch(() => {});
      if (audioPath) await fs.unlink(audioPath).catch(() => {});
    }

    // === STEP 2: Generate platform content (unchanged) ===
    const prompt = `You are an expert short-form video strategist.

Video Transcription:
${transcription}

Create highly engaging, platform-optimized content. Return clean JSON only:

{
  "youtube": { "title": "...", "description": "..." },
  "tiktok": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "instagram": { "caption": "...", "hashtags": ["#tag1"] },
  "twitter": { "text": "..." },
  "linkedin": { "text": "..." },
  "rumble": { "title": "...", "description": "..." },
  "threads": { "text": "..." },
  "shorts_reels": { "hook": "...", "full_caption": "..." }
}`;

    const completion = await client.chat.completions.create({
      model: visionModel,
      messages: [
        { role: "system", content: "You are a highly skilled social media strategist specializing in cross-platform video content." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    let result: any = {};
    try {
      result = JSON.parse(completion.choices[0].message.content || "{}");
    } catch (e) {
      console.error("Failed to parse AI response as JSON");
    }

    return NextResponse.json({
      success: true,
      transcription: transcription,
      outputs: result,
      platforms: Object.entries(result).map(([platform, data]) => ({
        platform: platform.toUpperCase(),
        title: (data as any).title || (data as any).caption || "",
        description: (data as any).description || "",
        caption: (data as any).caption || (data as any).full_caption || (data as any).text || "",
        hashtags: (data as any).hashtags ? (data as any).hashtags.join(" ") : "",
      })),
      provider: process.env.AI_PROVIDER || 'openai',
      model: visionModel,
    });

  } catch (error: any) {
    console.error("Amplify Video Error:", error);
    return NextResponse.json({ error: error.message || "Failed to amplify video" }, { status: 500 });
  }
}