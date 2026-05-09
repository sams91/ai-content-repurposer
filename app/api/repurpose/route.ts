// app/api/repurpose/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getModel } from '@/lib/ai';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    let content = '';
    let originalContentForHistory = '';

    const file = formData.get('file') as File | null;
    const textInput = formData.get('content') as string | null;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.pdf')) {
        return NextResponse.json({ error: "PDF support is temporarily disabled." }, { status: 400 });
      } else if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
        originalContentForHistory = content;
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        content = buffer.toString('utf-8');
        originalContentForHistory = content;
      } else {
        return NextResponse.json({ error: "Unsupported file type. Use DOCX or TXT." }, { status: 400 });
      }
    } else if (textInput) {
      content = textInput;
      originalContentForHistory = textInput;
    } else {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "No extractable text found" }, { status: 400 });
    }

    // === AI Provider Toggle ===
    const client = getAIClient();
    const model = getModel();

    const systemPrompt = `You are a professional content repurposer. Create one clear string per platform. 
NEVER return nested objects or JSON inside fields.

Platforms to create:
- linkedin: Professional post
- twitter: Short, punchy tweet
- instagram: Engaging caption with hashtags
- youtube: Title + full description
- rumble: Title + description
- threads: Conversational post
- newsletter: Newsletter-style version
- email: Short email version
- odysee: Title + description

Return ONLY this exact JSON structure with simple strings:
{"linkedin": "...", "twitter": "...", "instagram": "...", "youtube": "...", "rumble": "...", "threads": "...", "newsletter": "...", "email": "...", "odysee": "..."}`;

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      temperature: 0.65,
    });

    let raw = completion.choices[0].message.content || "{}";
    let parsed: any = {};

    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse JSON, falling back");
      parsed = {
        linkedin: raw,
        twitter: raw,
        instagram: raw,
        youtube: raw,
        rumble: raw,
        threads: raw,
        newsletter: raw,
        email: raw,
        odysee: raw,
      };
    }

    // Safety pass
    Object.keys(parsed).forEach(key => {
      if (typeof parsed[key] !== 'string') {
        parsed[key] = JSON.stringify(parsed[key]);
      }
    });

    return NextResponse.json({
      outputs: parsed,
      originalContent: originalContentForHistory,
      provider: process.env.AI_PROVIDER || 'openai',
      model: model
    });

  } catch (error: any) {
    console.error("Repurpose API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to process content" 
    }, { status: 500 });
  }
}