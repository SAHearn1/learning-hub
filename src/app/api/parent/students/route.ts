/**
 * Parent Students API
 * Returns list of students associated with parent account
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getUserFromClerkId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get parent user
    const parent = await getUserFromClerkId(clerkId);

    if (!parent || parent.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get parent record with children
    const parentRecord = await prisma.parent.findUnique({
      where: { userId: parent.id },
      include: {
        children: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isMinor: true,
                dateOfBirth: true,
                consentStatus: true,
                consentGrantedAt: true,
              },
            },
          },
        },
      },
    });

    if (!parentRecord) {
      return NextResponse.json({ students: [] });
    }

    const students = parentRecord.children.map((child) => child.user);

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Failed to fetch parent students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
