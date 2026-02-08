import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { evaluateThinkingQuality, generateThinkingPrompt } from '@/lib/assessments/thinking-evaluator';
import { trackReasoningMove } from '@/lib/assessments/reasoning-move-tracker';
import { EngagementMode, ReasoningMove } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, problemContext, engagementMode, targetReasoningMoves } = body;

    // Validate required fields
    if (!sessionId || !problemContext) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, problemContext' },
        { status: 400 }
      );
    }

    // Validate engagement mode
    const mode: EngagementMode = engagementMode || 'FORWARD';
    if (!Object.values(EngagementMode).includes(mode)) {
      return NextResponse.json(
        { error: `Invalid engagement mode. Must be one of: ${Object.values(EngagementMode).join(', ')}` },
        { status: 400 }
      );
    }

    // Generate thinking prompt
    const prompt = await generateThinkingPrompt(mode, problemContext, targetReasoningMoves);

    return NextResponse.json({
      success: true,
      prompt,
      mode,
      message: 'Thinking assessment prompt generated',
    });
  } catch (error) {
    console.error('Error generating thinking assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate thinking assessment',
        details: undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, studentResponse, problemContext, engagementMode } = body;

    // Validate required fields
    if (!sessionId || !studentResponse || !problemContext) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, studentResponse, problemContext' },
        { status: 400 }
      );
    }

    // Get session info
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Validate engagement mode
    const mode: EngagementMode = engagementMode || 'FORWARD';

    // Evaluate thinking quality using AI
    const evaluation = await evaluateThinkingQuality(studentResponse, problemContext, mode);

    // Create thinking assessment record
    const thinkingAssessment = await db.thinkingAssessment.create({
      data: {
        sessionId,
        assessmentType: 'INTEGRATED',
        reasoningArticulation: evaluation.thinkingQuality.reasoningArticulation,
        assumptionAwareness: evaluation.thinkingQuality.assumptionAwareness,
        evidenceEvaluation: evaluation.thinkingQuality.evidenceEvaluation,
        alternativePerspectives: evaluation.thinkingQuality.alternativePerspectives,
        conclusionJustification: evaluation.thinkingQuality.conclusionJustification,
        metacognitiveAwareness: evaluation.thinkingQuality.metacognitiveAwareness,
        fluency: evaluation.creativity.fluency,
        flexibility: evaluation.creativity.flexibility,
        originality: evaluation.creativity.originality,
        elaboration: evaluation.creativity.elaboration,
        riskTaking: evaluation.creativity.riskTaking,
        modeUsed: mode,
        reasoningMovesUsed: evaluation.reasoningMovesUsed,
        rawResponse: studentResponse,
        aiAnalysis: evaluation.aiAnalysis,
        traceProtocolEvidence: {
          strengths: evaluation.strengths,
          areasForGrowth: evaluation.areasForGrowth,
        },
      },
    });

    // Track reasoning moves used
    for (const move of evaluation.reasoningMovesUsed) {
      await trackReasoningMove({
        studentId: session.student.id,
        move,
        wasPrompted: false, // Assume spontaneous in this context
      });
    }

    return NextResponse.json({
      success: true,
      assessment: thinkingAssessment,
      evaluation,
      message: 'Thinking assessment evaluated successfully',
    });
  } catch (error) {
    console.error('Error evaluating thinking assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to evaluate thinking assessment',
        details: undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const studentId = searchParams.get('studentId');

    if (!sessionId && !studentId) {
      return NextResponse.json(
        { error: 'Either sessionId or studentId is required' },
        { status: 400 }
      );
    }

    // Build query
    const where: any = {};

    if (sessionId) {
      where.sessionId = sessionId;
    } else if (studentId) {
      where.session = {
        studentId,
      };
    }

    const assessments = await db.thinkingAssessment.findMany({
      where,
      include: {
        session: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      assessments,
    });
  } catch (error) {
    console.error('Error fetching thinking assessments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch thinking assessments',
        details: undefined,
      },
      { status: 500 }
    );
  }
}
