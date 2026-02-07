import { anthropic, AI_MODELS } from '../ai/client';
import type { BloomsLevel, Subject } from '@prisma/client';
import type { AssessmentQuestion } from './diagnostic-generator';

export interface FormativeCheckOptions {
  subject: Subject;
  gradeLevel: number;
  currentTopic: string;
  recentContent: string;
  targetBloomsLevel?: BloomsLevel;
}

export async function generateFormativeCheck(
  options: FormativeCheckOptions
): Promise<AssessmentQuestion> {
  const { subject, gradeLevel, currentTopic, recentContent, targetBloomsLevel = 'UNDERSTAND' } = options;

  const prompt = `Generate a quick formative check question for a student learning about "${currentTopic}" in ${subject} at grade ${gradeLevel}.

Recent content covered:
${recentContent}

Requirements:
1. Create a question that checks understanding of what was just taught
2. Target Bloom's level: ${targetBloomsLevel}
3. Make it quick to answer (1-2 minutes)
4. Include scaffolding hints if they struggle

Format as JSON:
{
  "question": "...",
  "type": "multiple_choice | open_ended | problem_solving",
  "difficulty": 2,
  "bloomsLevel": "${targetBloomsLevel}",
  "options": ["A", "B", "C", "D"] (if multiple_choice),
  "correctAnswer": "..." (if multiple_choice),
  "rubric": "..." (if open_ended),
  "scaffoldHints": ["hint1", "hint2"]
}`;

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

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const question: AssessmentQuestion = JSON.parse(jsonMatch[0]);
  return question;
}

export async function generateQuickReview(
  subject: Subject,
  gradeLevel: number,
  concepts: string[]
): Promise<AssessmentQuestion[]> {
  const prompt = `Generate 3 quick review questions for ${subject} at grade ${gradeLevel} covering these concepts:
${concepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Make them brief and focus on key understanding. Mix question types.

Format as JSON array:
[
  {
    "question": "...",
    "type": "multiple_choice | open_ended",
    "difficulty": 2,
    "bloomsLevel": "UNDERSTAND | APPLY",
    "options": ["A", "B", "C", "D"] (if multiple_choice),
    "correctAnswer": "..." (if multiple_choice),
    "rubric": "..." (if open_ended),
    "scaffoldHints": ["hint1", "hint2"]
  }
]`;

  const response = await anthropic.messages.create({
    model: AI_MODELS.lightweight,
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

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const questions: AssessmentQuestion[] = JSON.parse(jsonMatch[0]);
  return questions;
}
