import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODELS = {
  primary: process.env.ANTHROPIC_MODEL_PRIMARY || 'claude-sonnet-5',
  lightweight: process.env.ANTHROPIC_MODEL_LIGHTWEIGHT || 'claude-haiku-4-5',
} as const;
