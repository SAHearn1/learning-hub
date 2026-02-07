import { anthropic, AI_MODELS } from '../ai/client';
import type { AssessmentType, BloomsLevel, Subject } from '@prisma/client';

export interface GenerateAssessmentOptions {
  subject: Subject;
  gradeLevel: number;
  topic?: string;
  difficulty?: number;
  bloomsLevel?: BloomsLevel;
  count?: number;
}

export interface AssessmentQuestion {
  question: string;
  type: 'multiple_choice' | 'open_ended' | 'problem_solving';
  difficulty: number;
  bloomsLevel: BloomsLevel;
  options?: string[];
  correctAnswer?: string;
  rubric?: string;
  scaffoldHints?: string[];
}

export async function generateDiagnosticQuestions(
  options: GenerateAssessmentOptions
): Promise<AssessmentQuestion[]> {
  const { subject, gradeLevel, count = 5 } = options;

  const prompt = `Generate ${count} diagnostic assessment questions for ${subject} at grade ${gradeLevel}.

Requirements:
1. Create questions that identify knowledge gaps and prerequisite understanding
2. Vary difficulty from 1 (basic) to 5 (advanced)
3. Include questions across different Bloom's levels (REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE)
4. For each question, provide:
   - The question text
   - Type: multiple_choice, open_ended, or problem_solving
   - Difficulty level (1-5)
   - Bloom's level
   - For multiple choice: 4 options with correct answer
   - For open-ended: evaluation rubric
   - 2-3 scaffold hints if student struggles

Format as JSON array:
[
  {
    "question": "...",
    "type": "multiple_choice",
    "difficulty": 2,
    "bloomsLevel": "UNDERSTAND",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "B",
    "scaffoldHints": ["hint1", "hint2"]
  }
]`;

  const response = await anthropic.messages.create({
    model: AI_MODELS.primary,
    max_tokens: 4096,
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

  // Extract JSON from response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const questions: AssessmentQuestion[] = JSON.parse(jsonMatch[0]);
  return questions;
}

export async function generateAdaptiveFollowUp(
  previousResponse: string,
  wasCorrect: boolean,
  currentDifficulty: number,
  subject: Subject,
  gradeLevel: number
): Promise<AssessmentQuestion> {
  const adjustedDifficulty = wasCorrect
    ? Math.min(5, currentDifficulty + 1)
    : Math.max(1, currentDifficulty - 1);

  const prompt = `The student just ${wasCorrect ? 'correctly' : 'incorrectly'} answered a question at difficulty ${currentDifficulty}.
Their response: "${previousResponse}"

Generate an adaptive follow-up question for ${subject} at grade ${gradeLevel} with difficulty ${adjustedDifficulty}.

${
  wasCorrect
    ? 'Challenge them with a slightly harder question.'
    : 'Assess their understanding with a simpler question to identify the gap.'
}

Format as JSON:
{
  "question": "...",
  "type": "multiple_choice | open_ended | problem_solving",
  "difficulty": ${adjustedDifficulty},
  "bloomsLevel": "REMEMBER | UNDERSTAND | APPLY | ANALYZE | EVALUATE | CREATE",
  "options": ["A", "B", "C", "D"] (if multiple_choice),
  "correctAnswer": "..." (if multiple_choice),
  "rubric": "..." (if open_ended),
  "scaffoldHints": ["hint1", "hint2"]
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

  const question: AssessmentQuestion = JSON.parse(jsonMatch[0]);
  return question;
}
