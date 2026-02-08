import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { LearnClient } from './learn-client';

export default async function LearnPage() {
  const { userId: clerkId } = auth();
  
  if (!clerkId) {
    redirect('/sign-in');
  }

  // Fetch user and student profile
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: {
      student: {
        include: {
          iepAccommodations: {
            where: { active: true },
          },
        },
      },
    },
  });

  if (!user?.student) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-neutral-900">Learn</h1>
        <p className="mt-3 text-neutral-700">
          Student profile not found. Please contact your administrator.
        </p>
      </main>
    );
  }

  // Find or create active session
  let session = await db.session.findFirst({
    where: {
      studentId: user.student.id,
      endedAt: null,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  });

  // If no active session, create one
  if (!session) {
    session = await db.session.create({
      data: {
        tenantId: user.tenantId,
        studentId: user.student.id,
        subject: 'MATH', // Default subject, could be made configurable
        currentPhase: 'ROOT',
        engagementMode: 'FORWARD',
        regulationState: { level: 70, signals: [], interventionCount: 0 },
        metadata: {},
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Add welcome system message
    await db.message.create({
      data: {
        sessionId: session.id,
        role: 'SYSTEM',
        content: 'Welcome to your learning session! How are you feeling today? Ready to grow some thinking?',
      },
    });

    // Reload session with the new message
    session = await db.session.findUnique({
      where: { id: session.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as typeof session;
  }

  // Extract regulation state
  const regulationState = session.regulationState as { level?: number } | null;
  const regulationLevel = regulationState?.level ?? 70;

  // Pass data to client component
  return (
    <LearnClient
      session={{
        id: session.id,
        subject: session.subject,
        currentPhase: session.currentPhase,
        engagementMode: session.engagementMode,
        startedAt: session.startedAt,
      }}
      messages={session.messages.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt,
      }))}
      regulationLevel={regulationLevel}
      studentId={user.student.id}
    />
  );
}
