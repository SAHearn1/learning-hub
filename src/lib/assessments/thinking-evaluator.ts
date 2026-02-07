import { anthropic, AI_MODELS } from '../ai/client';
import type { EngagementMode, ReasoningMove } from '@prisma/client';

export interface ThinkingQualityScores {
  reasoningArticulation: number; // 1-5
  assumptionAwareness: number;
  evidenceEvaluation: number;
  alternativePerspectives: number;
  conclusionJustification: number;
  metacognitiveAwareness: number;
}

export interface CreativityScores {
  fluency: number; // 1-5
  flexibility: number;
  originality: number;
  elaboration: number;
  riskTaking: number;
}

export interface ThinkingEvaluation {
  thinkingQuality: ThinkingQualityScores;
  creativity: CreativityScores;
  reasoningMovesUsed: ReasoningMove[];
  aiAnalysis: string;
  strengths: string[];
  areasForGrowth: string[];
}

const REASONING_MOVES: ReasoningMove[] = [
  'DECOMPOSE',
  'IDENTIFY',
  'COMPARE',
  'CLASSIFY',
  'SEQUENCE',
  'CAUSE_EFFECT',
  'QUESTION',
  'CHALLENGE',
  'VERIFY',
  'JUSTIFY',
  'CRITIQUE',
  'WEIGH',
  'HYPOTHESIZE',
  'CONNECT',
  'GENERALIZE',
  'SPECIALIZE',
  'TRANSFORM',
  'CREATE',
  'MONITOR',
  'ADJUST',
  'REFLECT',
  'PLAN',
];

export async function evaluateThinkingQuality(
  studentResponse: string,
  problemContext: string,
  engagementMode: EngagementMode
): Promise<ThinkingEvaluation> {
  const prompt = `Evaluate the thinking quality and creativity in this student response.

Problem Context:
${problemContext}

Engagement Mode: ${engagementMode}

Student Response:
${studentResponse}

Evaluate on these dimensions (1-5 scale):

THINKING QUALITY:
1. Reasoning Articulation: How clearly does the student express their thinking process?
2. Assumption Awareness: Do they identify and question assumptions?
3. Evidence Evaluation: Do they support claims with evidence?
4. Alternative Perspectives: Do they consider multiple viewpoints or approaches?
5. Conclusion Justification: Do they justify their conclusions?
6. Metacognitive Awareness: Do they reflect on their own thinking?

CREATIVITY:
1. Fluency: How many ideas or approaches do they generate?
2. Flexibility: Do they show different types of thinking or approaches?
3. Originality: Are their ideas unique or novel?
4. Elaboration: Do they develop ideas in detail?
5. Risk Taking: Are they willing to try unconventional approaches?

REASONING MOVES USED (identify which apply from this list):
${REASONING_MOVES.join(', ')}

Format response as JSON:
{
  "thinkingQuality": {
    "reasoningArticulation": 3,
    "assumptionAwareness": 2,
    "evidenceEvaluation": 4,
    "alternativePerspectives": 3,
    "conclusionJustification": 4,
    "metacognitiveAwareness": 2
  },
  "creativity": {
    "fluency": 3,
    "flexibility": 2,
    "originality": 3,
    "elaboration": 4,
    "riskTaking": 2
  },
  "reasoningMovesUsed": ["DECOMPOSE", "IDENTIFY", "JUSTIFY"],
  "aiAnalysis": "Detailed analysis of the student's thinking...",
  "strengths": ["Clear articulation", "Good use of evidence"],
  "areasForGrowth": ["Consider alternative approaches", "Question assumptions more"]
}`;

  const response = await anthropic.messages.create({
    model: AI_MODELS.primary,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const evaluation: ThinkingEvaluation = JSON.parse(jsonMatch[0]);
  return evaluation;
}

export async function generateThinkingPrompt(
  mode: EngagementMode,
  problemContext: string,
  targetReasoningMoves?: ReasoningMove[]
): Promise<string> {
  const movePrompts: Record<EngagementMode, string> = {
    FORWARD: 'Explain your thinking as you solve this problem step by step.',
    REVERSE: 'Work backward from the solution. Why does this answer make sense?',
    ERROR_ANALYSIS: 'This solution has an error. Find it and explain why it\'s wrong.',
    MULTIPLE_PATHWAYS: 'Show at least two different ways to solve this problem.',
    PROBLEM_POSING: 'Create your own similar problem and solve it.',
  };

  let prompt = movePrompts[mode];

  if (targetReasoningMoves && targetReasoningMoves.length > 0) {
    const moveDescriptions: Record<string, string> = {
      DECOMPOSE: 'break it into smaller parts',
      IDENTIFY: 'identify key elements',
      COMPARE: 'compare different aspects',
      CLASSIFY: 'group or categorize',
      SEQUENCE: 'put in logical order',
      CAUSE_EFFECT: 'explain what causes what',
      QUESTION: 'ask clarifying questions',
      CHALLENGE: 'question assumptions',
      VERIFY: 'check your work',
      JUSTIFY: 'explain your reasoning',
      CRITIQUE: 'evaluate the approach',
      WEIGH: 'consider trade-offs',
      HYPOTHESIZE: 'make predictions',
      CONNECT: 'link to what you know',
      GENERALIZE: 'find patterns',
      SPECIALIZE: 'apply to specific cases',
      TRANSFORM: 'represent in different ways',
      CREATE: 'generate new ideas',
      MONITOR: 'track your understanding',
      ADJUST: 'modify your approach',
      REFLECT: 'think about your thinking',
      PLAN: 'plan your strategy',
    };

    const moveInstructions = targetReasoningMoves
      .map((move) => moveDescriptions[move])
      .filter(Boolean)
      .join(', ');

    prompt += `\n\nTry to ${moveInstructions} as you work through this.`;
  }

  return prompt;
}

export function calculateOverallThinkingScore(
  thinkingQuality: ThinkingQualityScores,
  creativity: CreativityScores
): number {
  // Average thinking quality scores (weight more heavily)
  const thinkingAvg =
    (thinkingQuality.reasoningArticulation +
      thinkingQuality.assumptionAwareness +
      thinkingQuality.evidenceEvaluation +
      thinkingQuality.alternativePerspectives +
      thinkingQuality.conclusionJustification +
      thinkingQuality.metacognitiveAwareness) /
    6;

  // Average creativity scores
  const creativityAvg =
    (creativity.fluency +
      creativity.flexibility +
      creativity.originality +
      creativity.elaboration +
      creativity.riskTaking) /
    5;

  // Weighted combination: 60% thinking quality, 40% creativity
  const overall = thinkingAvg * 0.6 + creativityAvg * 0.4;

  return Math.round(overall * 100) / 100; // Round to 2 decimal places
}
