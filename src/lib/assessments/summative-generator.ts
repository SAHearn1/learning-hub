import { anthropic, AI_MODELS } from '../ai/client';
import type { BloomsLevel, Subject } from '@prisma/client';
import type { AssessmentQuestion } from './diagnostic-generator';

export interface SummativeAssessmentOptions {
  subject: Subject;
  gradeLevel: number;
  topicName: string;
  learningObjectives: string[];
  questionCount?: number;
}

export async function generateSummativeAssessment(
  options: SummativeAssessmentOptions
): Promise<AssessmentQuestion[]> {
  const { subject, gradeLevel, topicName, learningObjectives, questionCount = 8 } = options;

  const prompt = `Generate a comprehensive summative assessment with ${questionCount} questions for "${topicName}" in ${subject} at grade ${gradeLevel}.

Learning objectives to assess:
${learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Requirements:
1. Cover all learning objectives
2. Balance across Bloom's taxonomy levels:
   - 2 REMEMBER/UNDERSTAND questions
   - 3 APPLY questions
   - 2 ANALYZE/EVALUATE questions
   - 1 CREATE question
3. Mix of question types (multiple choice, open-ended, problem-solving)
4. Difficulty range from 2-5
5. Include rubrics for open-ended questions
6. Provide scaffolding hints

Format as JSON array:
[
  {
    "question": "...",
    "type": "multiple_choice | open_ended | problem_solving",
    "difficulty": 3,
    "bloomsLevel": "APPLY",
    "options": ["A", "B", "C", "D"] (if multiple_choice),
    "correctAnswer": "B" (if multiple_choice),
    "rubric": "..." (if open_ended or problem_solving),
    "scaffoldHints": ["hint1", "hint2", "hint3"]
  }
]`;

  const response = await anthropic.messages.create({
    model: AI_MODELS.primary,
    max_tokens: 6000,
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

  const questions: AssessmentQuestion[] = JSON.parse(jsonMatch[0]);
  return questions;
}

export function calculateMasteryScore(
  responses: Array<{ isCorrect: boolean; difficulty: number; bloomsLevel: BloomsLevel }>
): number {
  if (responses.length === 0) return 0;

  // Weight by difficulty and Bloom's level
  const bloomsWeights: Record<BloomsLevel, number> = {
    REMEMBER: 1.0,
    UNDERSTAND: 1.2,
    APPLY: 1.5,
    ANALYZE: 1.8,
    EVALUATE: 2.0,
    CREATE: 2.2,
  };

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const response of responses) {
    const weight = response.difficulty * bloomsWeights[response.bloomsLevel];
    totalWeight += weight;
    if (response.isCorrect) {
      earnedWeight += weight;
    }
  }

  const masteryScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
  return Math.round(masteryScore * 100) / 100; // Round to 2 decimal places
}
