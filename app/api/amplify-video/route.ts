// app/api/amplify-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getModel, getVisionModel } from '@/lib/ai';
import OpenAI from 'openai';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const execFilePromise = promisify(execFile);

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const userId = formData.get('user_id') as string | null;

    if (!videoFile) return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    if (!videoFile.type.startsWith('video/')) return NextResponse.json({ error: "File must be a video" }, { status: 400 });
    if (videoFile.size > MAX_SIZE_BYTES) return NextResponse.json({ error: `Video file is too large (max 2GB)` }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const client = getAIClient();
    const visionModel = getVisionModel();

    // === STEP 1: Audio extraction + Whisper (forced English) ===
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
      await execFilePromise('ffmpeg', [
        '-i', inputPath,
        '-vn',
        '-acodec', 'libmp3lame',
        '-b:a', '64k',
        '-ac', '1',
        '-ar', '16000',
        '-y',
        audioPath
      ]);
      const audioBuffer = await fs.readFile(audioPath);
      const audioMB = audioBuffer.length / (1024 * 1024);
      console.log(`✅ Audio extracted: ${audioMB.toFixed(2)} MB`);

      if (audioMB > 24) {
        console.warn("⚠️ Re-compressing to 32kbps");
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
        file: new File([await fs.readFile(audioPath)], 'audio.mp3', { type: 'audio/mpeg' }),
        model: "whisper-1",
        language: 'en',
        response_format: "verbose_json",
      });
      transcription = transcriptionResponse.text?.trim() || "No speech detected.";
      console.log("✅ Whisper transcription successful (English forced):", transcription.substring(0, 120) + "...");
    } catch (transErr: any) {
      console.error("❌ Whisper / ffmpeg error:", transErr.message);
    } finally {
      if (inputPath) await fs.unlink(inputPath).catch(() => {});
      if (audioPath) await fs.unlink(audioPath).catch(() => {});
    }

    // === STEP 2: Generate platform content + TRUE Smart Clips ===
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
  "shorts_reels": { "hook": "...", "full_caption": "..." },
  "clipIdeas": [
    { "duration": "15", "start": 12, "end": 27, "reason": "Strongest hook that grabs attention in first 15 seconds" },
    { "duration": "30", "start": 45, "end": 75, "reason": "Best 30-second emotional moment" },
    { "duration": "60", "start": 120, "end": 180, "reason": "Most shareable 60-second story segment" }
  ]
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

    let outputs: any = {};
    try {
      outputs = JSON.parse(completion.choices[0].message.content || "{}");
    } catch (e) {
      console.error("Failed to parse AI response as JSON");
    }

    // === STEP 3: Upload to Supabase Storage with retry ===
    const fileExt = videoFile.name.split('.').pop() || 'mp4';
    const fileName = `${userId}/video-${Date.now()}.${fileExt}`;
    console.log(`📤 Uploading ${(videoFile.size / (1024 * 1024)).toFixed(1)} MB video to Supabase Storage...`);

    let uploadAttempts = 0;
    const maxAttempts = 3;
    let publicUrl: string | null = null;
    let lastError: any = null;

    while (uploadAttempts < maxAttempts) {
      uploadAttempts++;
      try {
        const { data: uploadData, error } = await supabaseServer.storage
          .from('videos')
          .upload(fileName, videoFile, {
            contentType: videoFile.type,
            upsert: true,
            cacheControl: '3600',
          });
        if (error) throw error;
        if (uploadData) {
          const { data: urlData } = supabaseServer.storage.from('videos').getPublicUrl(fileName);
          publicUrl = urlData.publicUrl;
          console.log(`✅ Video uploaded successfully on attempt ${uploadAttempts}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Upload attempt ${uploadAttempts} failed:`, err.message);
        if (uploadAttempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1500)); // backoff
        }
      }
    }

    if (!publicUrl) {
      console.error("Storage upload error after retries:", lastError);
      return NextResponse.json({
        error: `Storage upload failed after ${maxAttempts} attempts. This is usually a temporary network issue between Vercel and Supabase. Please try again in a few seconds. If it persists, check your Supabase dashboard logs.`,
      }, { status: 502 });
    }

    // === Save to history ===
    const { data: historyRecord, error: dbError } = await supabaseServer
      .from('video_history')
      .insert({
        user_id: userId,
        video_url: publicUrl,
        file_name: videoFile.name,
        transcription,
        amplified_outputs: outputs,
        duration_seconds: null,
      })
      .select('id')
      .single();
    if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);

    console.log(`✅ Video saved to history! ID: ${historyRecord.id}`);

    return NextResponse.json({
      success: true,
      transcription,
      outputs,
      platforms: Object.entries(outputs).map(([platform, data]: [string, any]) => ({
        platform: platform.toUpperCase().replace('_', '/'),
        title: data.title || data.caption || data.hook || "",
        description: data.description || "",
        caption: data.caption || data.full_caption || data.text || data.hook || "",
        hashtags: data.hashtags || [],
      })),
      clipIdeas: outputs.clipIdeas || [],
      video_url: publicUrl,
      file_name: videoFile.name,
      type: 'video'
    });

  } catch (error: any) {
    console.error('Amplify video error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}