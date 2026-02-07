import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDiagnosticQuestions } from '@/lib/assessments/diagnostic-generator';
import { Subject } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, subject, gradeLevel, sessionId } = body;

    // Validate required fields
    if (!studentId || !subject || !gradeLevel || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, subject, gradeLevel, sessionId' },
        { status: 400 }
      );
    }

    // Validate subject
    if (!Object.values(Subject).includes(subject)) {
      return NextResponse.json(
        { error: `Invalid subject. Must be one of: ${Object.values(Subject).join(', ')}` },
        { status: 400 }
      );
    }

    // Generate diagnostic questions using AI
    const questions = await generateDiagnosticQuestions({
      subject,
      gradeLevel,
      count: 5,
    });

    // Store assessments in database
    const createdAssessments = [];
    for (const question of questions) {
      const assessment = await db.assessment.create({
        data: {
          sessionId,
          type: 'DIAGNOSTIC',
          bloomsLevel: question.bloomsLevel,
          difficulty: question.difficulty,
          question: question.question,
          metadata: {
            type: question.type,
            options: question.options,
            correctAnswer: question.correctAnswer,
            rubric: question.rubric,
            scaffoldHints: question.scaffoldHints,
          },
        },
      });
      createdAssessments.push(assessment);
    }

    return NextResponse.json({
      success: true,
      assessments: createdAssessments,
      message: 'Diagnostic assessment created successfully',
    });
  } catch (error) {
    console.error('Error creating diagnostic assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create diagnostic assessment',
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

    if (!studentId && !sessionId) {
      return NextResponse.json(
        { error: 'Either studentId or sessionId is required' },
        { status: 400 }
      );
    }

    // Build query
    const where: any = {
      type: 'DIAGNOSTIC',
    };

    if (sessionId) {
      where.sessionId = sessionId;
    } else if (studentId) {
      where.session = {
        studentId,
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
    console.error('Error fetching diagnostic assessments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch diagnostic assessments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
