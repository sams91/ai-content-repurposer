// lib/ai.ts
import OpenAI from 'openai';

const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();

console.log(`[AI Config] Using provider: ${provider}`);

export const getAIClient = () => {
  if (provider === 'grok') {
    if (!process.env.GROK_API_KEY) {
      throw new Error('GROK_API_KEY is not set in environment variables');
    }
    return new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  // Default to OpenAI
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

export const getModel = () => {
  if (provider === 'grok') {
    return 'grok-4.1-fast';        // Fast + capable model
  }
  return 'gpt-4o-mini';            // Cost-effective default
};

// Optional: Helper for vision models later
export const getVisionModel = () => {
  if (provider === 'grok') {
    return 'grok-4.1-fast';        // Grok has strong vision
  }
  return 'gpt-4o';                 // Best vision model from OpenAI
};