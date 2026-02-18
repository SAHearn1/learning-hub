import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateFormativeCheck } from '@/lib/assessments/formative-generator';
import { Subject, BloomsLevel } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { hasRequiredMinorConsent } from '@/lib/compliance';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
      return NextResponse.json({ error: 'Parental consent required before formative assessments' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, currentTopic, recentContent, targetBloomsLevel } = body;

    // Validate required fields
    if (!sessionId || !currentTopic) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, currentTopic' },
        { status: 400 }
      );
    }

    // Get session info
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        student: { include: { user: { select: { id: true, tenantId: true } } } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (user.role === 'STUDENT' && session.student.user.id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate formative check question using AI
    const question = await generateFormativeCheck({
      subject: session.subject,
      gradeLevel: session.student.gradeLevel,
      currentTopic,
      recentContent: recentContent || 'Current tutoring session content',
      targetBloomsLevel: targetBloomsLevel || 'UNDERSTAND',
    });

    // Store assessment in database
    const assessment = await db.assessment.create({
      data: {
        sessionId,
        type: 'FORMATIVE',
        bloomsLevel: question.bloomsLevel,
        difficulty: question.difficulty,
        question: question.question,
        metadata: {
          type: question.type,
          options: question.options,
          correctAnswer: question.correctAnswer,
          rubric: question.rubric,
          scaffoldHints: question.scaffoldHints,
          topic: currentTopic,
        },
      },
    });

    return NextResponse.json({
      success: true,
      assessment,
      message: 'Formative check created successfully',
    });
  } catch (error) {
    console.error('Error creating formative check:', error);
    return NextResponse.json(
      { error: 'Failed to create formative check' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
      return NextResponse.json({ error: 'Parental consent required before formative assessments' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: { student: true },
    });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (user.role === 'STUDENT' && session.student.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assessments = await db.assessment.findMany({
      where: {
        sessionId,
        type: 'FORMATIVE',
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
    console.error('Error fetching formative checks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch formative checks' },
      { status: 500 }
    );
  }
}
