import Anthropic from '@anthropic-ai/sdk';

const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

if (!anthropicApiKey) {
  console.error('ANTHROPIC_API_KEY is missing in environment variables.');
}

export const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
});

export const CHAT_MODEL = process.env.CHAT_MODEL || 'claude-3-5-sonnet-20240620';