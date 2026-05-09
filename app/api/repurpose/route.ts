import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import mammoth from 'mammoth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    let content = '';

    const file = formData.get('file') as File | null;
    const textInput = formData.get('content') as string | null;

    let originalContentForHistory = textInput || '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.pdf')) {
        return Response.json({ error: "PDF support is temporarily disabled." }, { status: 400 });
      } else if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
        originalContentForHistory = content;
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        content = buffer.toString('utf-8');
        originalContentForHistory = content;
      } else {
        return Response.json({ error: "Unsupported file type. Use DOCX or TXT." }, { status: 400 });
      }
    } else if (textInput) {
      content = textInput;
      originalContentForHistory = textInput;
    } else {
      return Response.json({ error: "No content provided" }, { status: 400 });
    }

    if (!content.trim()) {
      return Response.json({ error: "No extractable text found" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional content repurposer. Create one clear string per platform. NEVER return nested objects or JSON inside fields.

Platforms:
- linkedin: Professional post
- twitter: Short tweet
- instagram: Caption + hashtags
- youtube: Title + description
- rumble: Title + description
- threads: Conversational post
- newsletter: Newsletter format
- email: Short email
- odysee: Title + description

Return ONLY this exact JSON structure with simple strings:
{"linkedin": "string", "twitter": "string", "instagram": "string", "youtube": "string", "rumble": "string", "threads": "string", "newsletter": "string", "email": "string", "odysee": "string"}`
        },
        {
          role: "user",
          content: content
        }
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

    // Final safety pass — ensure every value is a string
    Object.keys(parsed).forEach(key => {
      if (typeof parsed[key] !== 'string') {
        parsed[key] = JSON.stringify(parsed[key]);
      }
    });

    return Response.json({
      outputs: parsed,
      originalContent: originalContentForHistory
    });

  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to process content" }, { status: 500 });
  }
}