import type { ReasoningMove } from '@prisma/client';
import { anthropic, AI_MODELS } from '@/lib/ai/client';

export interface TraceData {
  reasoningMovesUsed: ReasoningMove[];
  thinkingQualityScores: {
    reasoningArticulation: number;
    assumptionAwareness: number;
    evidenceEvaluation: number;
    alternativePerspectives: number;
    conclusionJustification: number;
    metacognitiveAwareness: number;
  };
  creativityIndicators: {
    fluency: number;
    flexibility: number;
    originality: number;
    elaboration: number;
    riskTaking: number;
  };
}

const TRACE_ANALYSIS_PROMPT = `You are an expert in analyzing student thinking quality using the TRACE protocol (Thinking Reasoning And Creative Evaluation).

Analyze the student's response for:

1. **Reasoning Moves Used** - Identify which of these moves the student demonstrated:
   - DECOMPOSE: Breaking problems into smaller parts
   - IDENTIFY: Recognizing patterns or key information
   - COMPARE: Finding similarities/differences
   - CLASSIFY: Grouping or categorizing
   - SEQUENCE: Ordering steps or events
   - CAUSE_EFFECT: Explaining relationships
   - QUESTION: Asking probing questions
   - CHALLENGE: Questioning assumptions
   - VERIFY: Checking work
   - JUSTIFY: Explaining reasoning
   - CRITIQUE: Evaluating solutions
   - WEIGH: Considering alternatives
   - HYPOTHESIZE: Making educated guesses
   - CONNECT: Linking concepts
   - GENERALIZE: Extending to broader contexts
   - SPECIALIZE: Applying to specific cases
   - TRANSFORM: Changing representations
   - CREATE: Generating new ideas
   - MONITOR: Tracking progress
   - ADJUST: Modifying approach
   - REFLECT: Thinking about thinking
   - PLAN: Strategizing approach

2. **Thinking Quality Scores** (0-10 for each):
   - Reasoning Articulation: How well they explain their thinking
   - Assumption Awareness: Recognition of underlying assumptions
   - Evidence Evaluation: Use of evidence to support claims
   - Alternative Perspectives: Considering multiple viewpoints
   - Conclusion Justification: Supporting their conclusions
   - Metacognitive Awareness: Thinking about their thinking

3. **Creativity Indicators** (0-10 for each):
   - Fluency: Number of ideas generated
   - Flexibility: Variety of approaches
   - Originality: Uniqueness of thinking
   - Elaboration: Detail and depth
   - Risk Taking: Willingness to try novel approaches

Respond in JSON format:
{
  "reasoningMoves": ["MOVE1", "MOVE2"],
  "thinkingQuality": {
    "reasoningArticulation": 7,
    "assumptionAwareness": 5,
    "evidenceEvaluation": 6,
    "alternativePerspectives": 4,
    "conclusionJustification": 7,
    "metacognitiveAwareness": 5
  },
  "creativity": {
    "fluency": 6,
    "flexibility": 5,
    "originality": 7,
    "elaboration": 6,
    "riskTaking": 5
  },
  "brief_analysis": "Short explanation of assessment"
}`;

export async function analyzeThinkingQuality(
  studentResponse: string,
  problemContext: string
): Promise<TraceData | null> {
  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.lightweight,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Problem Context: ${problemContext}\n\nStudent Response: ${studentResponse}\n\nAnalyze this student's thinking quality.`,
        },
      ],
      system: TRACE_ANALYSIS_PROMPT,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return null;
    }

    // Extract JSON from response (might be wrapped in markdown)
    const text = content.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in TRACE analysis response');
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      reasoningMovesUsed: (analysis.reasoningMoves || []) as ReasoningMove[],
      thinkingQualityScores: {
        reasoningArticulation: analysis.thinkingQuality?.reasoningArticulation || 0,
        assumptionAwareness: analysis.thinkingQuality?.assumptionAwareness || 0,
        evidenceEvaluation: analysis.thinkingQuality?.evidenceEvaluation || 0,
        alternativePerspectives: analysis.thinkingQuality?.alternativePerspectives || 0,
        conclusionJustification: analysis.thinkingQuality?.conclusionJustification || 0,
        metacognitiveAwareness: analysis.thinkingQuality?.metacognitiveAwareness || 0,
      },
      creativityIndicators: {
        fluency: analysis.creativity?.fluency || 0,
        flexibility: analysis.creativity?.flexibility || 0,
        originality: analysis.creativity?.originality || 0,
        elaboration: analysis.creativity?.elaboration || 0,
        riskTaking: analysis.creativity?.riskTaking || 0,
      },
    };
  } catch (error) {
    console.error('Error analyzing thinking quality:', error);
    return null;
  }
}
