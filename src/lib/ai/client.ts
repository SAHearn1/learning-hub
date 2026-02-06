import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODELS = {
  primary: process.env.ANTHROPIC_MODEL_PRIMARY || 'claude-3-5-sonnet-20241022',
  lightweight: process.env.ANTHROPIC_MODEL_LIGHTWEIGHT || 'claude-3-haiku-20240307',
} as const;
