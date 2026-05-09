// app/api/amplify-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getModel, getVisionModel } from '@/lib/ai';
import OpenAI from 'openai';

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

    // Limit file size (roughly 100MB)
    if (videoFile.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Video file is too large (max 100MB)" }, { status: 400 });
    }

    const client = getAIClient();
    const visionModel = getVisionModel();

    // Step 1: Transcription using Whisper (OpenAI)
    let transcription = "No speech detected or transcription failed.";

    try {
      const whisper = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const transcriptionResponse = await whisper.audio.transcriptions.create({
        file: videoFile,
        model: "whisper-1",
        response_format: "verbose_json",
      });

      transcription = transcriptionResponse.text?.trim() || "No speech detected.";
    } catch (transErr: any) {
      console.warn("Whisper transcription failed:", transErr.message);
    }

    // Step 2: Generate platform-specific content
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
        { 
          role: "system", 
          content: "You are a highly skilled social media strategist specializing in cross-platform video content." 
        },
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
      provider: process.env.AI_PROVIDER || 'openai',
      model: visionModel,
    });

  } catch (error: any) {
    console.error("Amplify Video Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to amplify video" 
    }, { status: 500 });
  }
}