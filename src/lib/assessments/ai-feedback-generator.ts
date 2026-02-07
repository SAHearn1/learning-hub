import { anthropic, AI_MODELS } from '../ai/client';
import type { BloomsLevel } from '@prisma/client';

export interface FeedbackOptions {
  question: string;
  studentResponse: string;
  correctAnswer?: string;
  rubric?: string;
  bloomsLevel: BloomsLevel;
  difficulty: number;
  includeScaffold?: boolean;
}

export interface FeedbackResult {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: string;
  scaffoldHints?: string[];
  commonErrors?: string[];
  nextSteps?: string;
}

export async function generateAIFeedback(options: FeedbackOptions): Promise<FeedbackResult> {
  const {
    question,
    studentResponse,
    correctAnswer,
    rubric,
    bloomsLevel,
    difficulty,
    includeScaffold = true,
  } = options;

  const prompt = `Evaluate this student response and provide constructive feedback.

Question:
${question}

${correctAnswer ? `Correct Answer: ${correctAnswer}` : ''}
${rubric ? `Rubric:\n${rubric}` : ''}

Bloom's Level: ${bloomsLevel}
Difficulty: ${difficulty}/5

Student Response:
"${studentResponse}"

Provide evaluation in this format:

1. Is the response correct or accurate? (true/false)
2. Score (0-100): Based on the rubric or correctness
3. Feedback: Warm, encouraging feedback that:
   - Acknowledges what they did well
   - Identifies misconceptions gently
   - Explains the correct approach without just giving the answer
   - Uses "I notice..." and "I wonder..." language
4. ${includeScaffold ? 'Scaffold Hints: 2-3 progressive hints to guide them if they want to try again' : ''}
5. Common Errors: What common misconceptions does this reveal?
6. Next Steps: What should they practice next?

Format as JSON:
{
  "isCorrect": true,
  "score": 85,
  "feedback": "I notice you understood the key concept... I wonder if you considered...",
  "scaffoldHints": ["Think about...", "What if you tried...", "Consider..."],
  "commonErrors": ["Misunderstanding of X", "Confusion about Y"],
  "nextSteps": "Practice problems involving..."
}`;

  const response = await anthropic.messages.create({
    model: AI_MODELS.primary,
    max_tokens: 1500,
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

  const result: FeedbackResult = JSON.parse(jsonMatch[0]);
  return result;
}

export async function generateRemediationSuggestions(
  topic: string,
  knowledgeGaps: string[],
  studentLevel: string
): Promise<string[]> {
  const prompt = `A student at ${studentLevel} level has these knowledge gaps in "${topic}":
${knowledgeGaps.map((gap, i) => `${i + 1}. ${gap}`).join('\n')}

Suggest 3-5 specific learning activities or practice problems to address these gaps.
Make suggestions concrete, actionable, and appropriate for the student's level.

Format as JSON array of strings:
["Suggestion 1", "Suggestion 2", "Suggestion 3"]`;

  const response = await anthropic.messages.create({
    model: AI_MODELS.lightweight,
    max_tokens: 1024,
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

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const suggestions: string[] = JSON.parse(jsonMatch[0]);
  return suggestions;
}

export function provideSocraticHint(
  question: string,
  studentAttempt: string,
  hintLevel: number // 1 = most subtle, 3 = most direct
): string {
  // This is a template-based approach for immediate hints
  // The AI-generated scaffold hints are more sophisticated
  const hints: Record<number, string[]> = {
    1: [
      "What information do you already know about this?",
      "Can you break this into smaller parts?",
      "What's the first step you might take?",
    ],
    2: [
      "Think about what the question is really asking.",
      "Have you seen a similar problem before?",
      "What strategy might help here?",
    ],
    3: [
      "Let's focus on the key concept: ",
      "Remember that ",
      "Try starting with ",
    ],
  };

  const levelHints = hints[Math.min(hintLevel, 3)] || hints[1];
  return levelHints[Math.floor(Math.random() * levelHints.length)];
}
