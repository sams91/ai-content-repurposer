import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import os from 'os';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Convert audio to MP3 for better Whisper results
async function convertToMp3(inputBuffer: Buffer, originalName: string): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${Date.now()}${path.extname(originalName) || '.webm'}`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.mp3`);

  fs.writeFileSync(inputPath, inputBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate(128)
      .on('end', () => {
        const outputBuffer = fs.readFileSync(outputPath);
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        resolve(outputBuffer);
      })
      .on('error', (err) => {
        fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      })
      .save(outputPath);
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const userId = formData.get('user_id') as string | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 413 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    let audioBuffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const originalFileName = audioFile.name || `audio-${Date.now()}.webm`;

    // Convert to MP3 when needed
    let processedBuffer: Buffer = audioBuffer;
    let finalFileName = originalFileName;

    const needsConversion = audioFile.type.includes('webm') || 
                           audioFile.type.includes('ogg') || 
                           !audioFile.type.includes('mp3');

    if (needsConversion) {
      try {
        processedBuffer = await convertToMp3(audioBuffer, originalFileName) as Buffer;
        finalFileName = originalFileName.replace(/\.[^/.]+$/, '') + '.mp3';
      } catch (convertError) {
        console.warn('Audio conversion failed, using original file');
      }
    }

    // Upload to Supabase Storage
    const storagePath = `audio/${userId}/${Date.now()}-${finalFileName}`;
    let publicUrl: string | null = null;

    try {
      const { data: uploadData } = await supabase.storage
        .from('audio-uploads')
        .upload(storagePath, processedBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (uploadData) {
        publicUrl = supabase.storage.from('audio-uploads').getPublicUrl(storagePath).data.publicUrl;
      }
    } catch (storageError) {
      console.warn('Storage upload failed (continuing anyway):', storageError);
    }

    // === Whisper Transcription ===
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: new File([new Uint8Array(processedBuffer)], finalFileName, { type: 'audio/mpeg' }),
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    const transcriptionText = transcriptionResponse.text || '';

    if (!transcriptionText.trim()) {
      return NextResponse.json({ error: 'Could not transcribe audio' }, { status: 422 });
    }

    // === Structured Podcast Generation (All 8 Platforms + TRUE Smart Clips) ===
    const systemPrompt = `You are an expert podcast producer and social media content repurposer.

Given a podcast transcription, create high-quality structured output.

Return ONLY valid JSON with this exact structure:

{
  "showNotes": "Well-written show notes (300-500 words) with key takeaways",
  "chapters": [
    { "time": "00:00", "title": "Introduction", "summary": "Brief summary" }
  ],
  "keyQuotes": ["Most insightful quote 1", "Quote 2"],
  "clipIdeas": [
    { "duration": "15", "start": 45, "end": 60, "reason": "Strongest hook that grabs attention in first 15 seconds" },
    { "duration": "30", "start": 120, "end": 150, "reason": "Best 30-second emotional moment" },
    { "duration": "60", "start": 300, "end": 360, "reason": "Most shareable 60-second story segment" }
  ],
  "platforms": {
    "YouTube": { "title": "...", "description": "..." },
    "TikTok": { "caption": "..." },
    "Instagram": { "caption": "..." },
    "LinkedIn": { "text": "..." },
    "X": { "text": "..." },
    "Rumble": { "title": "...", "description": "..." },
    "Threads": { "caption": "..." },
    "ShortsReels": { "caption": "..." }
  }
}

Rules:
- clipIdeas MUST contain exactly three entries: one 15s, one 30s, one 60s — the single BEST moment for each duration.
- Timestamps must be realistic based on total length.
- Always return all 8 platforms.
- Optimize tone per platform.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Transcription:\n\n${transcriptionText}` }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    let structuredOutput: any = {};
    try {
      structuredOutput = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      structuredOutput = {
        showNotes: transcriptionText.slice(0, 700),
        chapters: [],
        keyQuotes: [],
        clipIdeas: [],
        platforms: {}
      };
    }

    // === SAVE TO HISTORY (plural amplified_outputs - matches video route) ===
    try {
      const { error: dbError } = await supabase
        .from('video_history')
        .insert({
          user_id: userId,
          file_name: finalFileName,
          video_url: publicUrl,
          transcription: transcriptionText,
          amplified_outputs: structuredOutput,
          duration_seconds: null,
        });

      if (dbError) console.error('❌ DB insert error:', dbError);
      else console.log('✅ Audio saved to video_history');
    } catch (dbError) {
      console.error('Failed to save to video_history:', dbError);
    }

    return NextResponse.json({
      success: true,
      transcription: transcriptionText,
      showNotes: structuredOutput.showNotes || '',
      chapters: structuredOutput.chapters || [],
      keyQuotes: structuredOutput.keyQuotes || [],
      clipIdeas: structuredOutput.clipIdeas || [],
      platforms: structuredOutput.platforms || {},
      audio_url: publicUrl,
      file_name: finalFileName,
      type: 'audio'
    });

  } catch (error: any) {
    console.error('Amplify audio error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}