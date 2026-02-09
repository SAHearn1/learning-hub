import type { NVCConcern } from '@prisma/client';
import { anthropic, AI_MODELS } from '@/lib/ai/client';

export interface NVCEvaluationResult {
  isCompliant: boolean;
  nvcScore: number; // 0-100
  concerns: NVCConcern[];
  judgmentalPhrases: string[];
  dismissivePhrases: string[];
  suggestedRevisions: string[];
  rawAnalysis: string;
  llmTokens: number;
  llmLatencyMs: number;
}

const NVC_EVALUATION_PROMPT = `You are an expert in Non-Violent Communication (NVC) principles and trauma-informed pedagogy. Your task is to evaluate AI tutor responses for adherence to NVC standards.

## Non-Violent Communication (NVC) Principles

NVC emphasizes:
1. **Observations vs Evaluations**: Describing what we observe without judgment
2. **Feelings**: Expressing emotions without blame
3. **Needs**: Connecting feelings to universal human needs
4. **Requests vs Demands**: Making clear requests, not demands

## Key Concerns to Identify

Analyze the response for these NVC violations:

1. **JUDGMENTAL_LANGUAGE**: Using evaluative or critical language
   - Examples: "You're wrong", "That's a bad approach", "You should know this"

2. **DISMISSIVE_TONE**: Minimizing or invalidating student feelings/concerns
   - Examples: "Don't worry about it", "That's not important", "You're overthinking"

3. **LACK_OF_EMPATHY**: Failing to acknowledge student emotions or struggles
   - Examples: Ignoring frustration, skipping emotional validation

4. **AUTHORITARIAN_LANGUAGE**: Commanding or controlling language
   - Examples: "You must do this", "Do it this way", "Follow my instructions"

5. **SHAMING_LANGUAGE**: Language that induces shame or embarrassment
   - Examples: "You should have learned this already", "Everyone knows this"

6. **COMPARISON**: Comparing student to others
   - Examples: "Other students find this easy", "Most people understand this"

7. **DEMAND_VS_REQUEST**: Making demands rather than inviting requests
   - Examples: "You need to try harder", "Fix this now"

8. **DIAGNOSIS_VS_OBSERVATION**: Diagnosing problems rather than observing
   - Examples: "You're not paying attention", "You don't care"

9. **BLAME_LANGUAGE**: Assigning blame rather than focusing on needs
   - Examples: "You made a mistake because you didn't listen"

10. **COERCIVE_LANGUAGE**: Using threats or punishment-based motivation
    - Examples: "If you don't do this, you'll fail", "You'll regret not learning this"

## Evaluation Criteria

**Compliant Response (80-100 score):**
- Uses observational language without judgment
- Validates student emotions and experiences
- Makes requests, not demands
- Shows empathy and understanding
- Focuses on needs and feelings
- Encourages autonomy and choice

**Partially Compliant (50-79 score):**
- Mostly respectful but has minor NVC violations
- May have 1-2 judgmental phrases
- Generally supportive tone

**Non-Compliant (<50 score):**
- Multiple NVC violations
- Judgmental, dismissive, or authoritarian tone
- Lacks empathy or emotional validation
- Uses demands, comparisons, or shaming language

## Response Format

Respond in JSON format:
{
  "isCompliant": true/false,
  "nvcScore": 85,
  "concerns": ["JUDGMENTAL_LANGUAGE", "DISMISSIVE_TONE"],
  "judgmentalPhrases": ["phrase 1", "phrase 2"],
  "dismissivePhrases": ["phrase 1"],
  "suggestedRevisions": ["Instead of 'You're wrong', try 'I notice the result doesn't match our expectation. Let's explore what happened.'"],
  "brief_analysis": "Overall assessment of the response's alignment with NVC principles"
}

**Important Guidelines:**
- isCompliant = true if nvcScore >= 80
- Include ALL phrases that violate NVC principles
- Provide specific, actionable revision suggestions
- Be thorough but fair in evaluation
- Consider the context of trauma-informed education for K-12 students`;

export async function evaluateNVCCompliance(
  assistantResponse: string,
  conversationContext?: string
): Promise<NVCEvaluationResult | null> {
  const startTime = Date.now();

  try {
    const userMessage = conversationContext
      ? `Conversation Context:\n${conversationContext}\n\nAssistant Response to Evaluate:\n${assistantResponse}`
      : `Assistant Response to Evaluate:\n${assistantResponse}`;

    const response = await anthropic.messages.create({
      model: AI_MODELS.lightweight, // Use Haiku for cost-effective evaluation
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      system: NVC_EVALUATION_PROMPT,
    });

    const latencyMs = Date.now() - startTime;
    const content = response.content[0];

    if (content.type !== 'text') {
      console.error('Non-text response from NVC evaluation');
      return null;
    }

    // Extract JSON from response (might be wrapped in markdown)
    const text = content.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in NVC evaluation response');
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Calculate token usage
    const totalTokens = response.usage.input_tokens + response.usage.output_tokens;

    return {
      isCompliant: analysis.isCompliant ?? false,
      nvcScore: analysis.nvcScore ?? 0,
      concerns: (analysis.concerns || []) as NVCConcern[],
      judgmentalPhrases: analysis.judgmentalPhrases || [],
      dismissivePhrases: analysis.dismissivePhrases || [],
      suggestedRevisions: analysis.suggestedRevisions || [],
      rawAnalysis: text,
      llmTokens: totalTokens,
      llmLatencyMs: latencyMs,
    };
  } catch (error) {
    console.error('Error evaluating NVC compliance:', error);
    return null;
  }
}

/**
 * Batch evaluate multiple responses asynchronously
 * Useful for periodic quality reviews or batch analysis
 */
export async function batchEvaluateNVC(
  responses: Array<{ id: string; content: string; context?: string }>
): Promise<Map<string, NVCEvaluationResult | null>> {
  const results = new Map<string, NVCEvaluationResult | null>();

  // Evaluate responses in parallel with a concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < responses.length; i += BATCH_SIZE) {
    const batch = responses.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (response) => ({
        id: response.id,
        result: await evaluateNVCCompliance(response.content, response.context),
      }))
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < responses.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
