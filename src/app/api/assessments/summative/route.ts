import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSummativeAssessment, calculateMasteryScore } from '@/lib/assessments/summative-generator';
import { updateProgress } from '@/lib/assessments/progress-calculator';
import { Subject } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, sessionId, topicId, topicName, learningObjectives } = body;

    // Validate required fields
    if (!studentId || !sessionId || !topicName || !learningObjectives) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, sessionId, topicName, learningObjectives' },
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

    // Get topic standards if topicId provided
    let standards = [];
    if (topicId) {
      const topic = await db.topic.findUnique({
        where: { id: topicId },
        include: {
          standards: true,
        },
      });
      standards = topic?.standards || [];
    }

    // Generate summative assessment using AI
    const questions = await generateSummativeAssessment({
      subject: session.subject,
      gradeLevel: session.student.gradeLevel,
      topicName,
      learningObjectives,
      questionCount: 8,
    });

    // Store assessments in database
    const createdAssessments = [];
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const standardId = standards[i % standards.length]?.id; // Distribute across standards

      const assessment = await db.assessment.create({
        data: {
          sessionId,
          standardId,
          type: 'SUMMATIVE',
          bloomsLevel: question.bloomsLevel,
          difficulty: question.difficulty,
          question: question.question,
          metadata: {
            type: question.type,
            options: question.options,
            correctAnswer: question.correctAnswer,
            rubric: question.rubric,
            scaffoldHints: question.scaffoldHints,
            topic: topicName,
            topicId,
          },
        },
      });
      createdAssessments.push(assessment);
    }

    return NextResponse.json({
      success: true,
      assessments: createdAssessments,
      message: 'Summative assessment created successfully',
    });
  } catch (error) {
    console.error('Error creating summative assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create summative assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const sessionId = searchParams.get('sessionId');
    const topicId = searchParams.get('topicId');

    if (!studentId && !sessionId && !topicId) {
      return NextResponse.json(
        { error: 'studentId, sessionId, or topicId is required' },
        { status: 400 }
      );
    }

    // Build query
    const where: any = {
      type: 'SUMMATIVE',
    };

    if (sessionId) {
      where.sessionId = sessionId;
    } else if (studentId) {
      where.session = {
        studentId,
      };
    }

    // Filter by topic if provided
    if (topicId) {
      where.metadata = {
        path: ['topicId'],
        equals: topicId,
      };
    }

    const assessments = await db.assessment.findMany({
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
        standard: true,
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
    console.error('Error fetching summative assessments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch summative assessments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
