import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    first_name: string | null;
    last_name: string | null;
    public_metadata: Record<string, unknown>;
  };
}

export async function POST(req: NextRequest) {
  const headerSecret = req.headers.get('x-clerk-secret');
  if (headerSecret !== process.env.CLERK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let event: ClerkWebhookEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { type, data } = event;

  if (type === 'user.created' || type === 'user.updated') {
    const email = data.email_addresses?.[0]?.email_address;
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    const role = (data.public_metadata?.role as string) || 'STUDENT';
    const tenantId = data.public_metadata?.tenantId as string | undefined;

    let tenant;
    if (tenantId) {
      tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    }
    if (!tenant) {
      tenant = await db.tenant.upsert({
        where: { slug: 'default' },
        update: {},
        create: { name: 'Default', slug: 'default' },
      });
    }

    const user = await db.user.upsert({
      where: { clerkUserId: data.id },
      update: {
        email,
        firstName: data.first_name ?? '',
        lastName: data.last_name ?? '',
        role: role as 'STUDENT' | 'EDUCATOR' | 'PARENT' | 'SCHOOL_ADMIN' | 'DISTRICT_ADMIN' | 'PLATFORM_ADMIN',
      },
      create: {
        clerkUserId: data.id,
        tenantId: tenant.id,
        email,
        firstName: data.first_name ?? '',
        lastName: data.last_name ?? '',
        role: role as 'STUDENT' | 'EDUCATOR' | 'PARENT' | 'SCHOOL_ADMIN' | 'DISTRICT_ADMIN' | 'PLATFORM_ADMIN',
      },
    });

    if (role === 'STUDENT' && type === 'user.created') {
      const gradeLevel = (data.public_metadata?.gradeLevel as number) || 5;
      await db.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          gradeLevel,
          learningPreferences: { modalities: ['visual', 'reading'], pacing: 'moderate', scaffoldingLevel: 'medium' },
          regulationProfile: { baselineLevel: 70, knownTriggers: [], preferredStrategies: [] },
        },
      });
    }

    if (role === 'EDUCATOR' && type === 'user.created') {
      await db.educator.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          certifications: [],
          specializations: [],
        },
      });
    }

    if (role === 'PARENT' && type === 'user.created') {
      await db.parent.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          childrenIds: [],
        },
      });
    }

    return NextResponse.json({ data: { userId: user.id } });
  }

  if (type === 'user.deleted') {
    await db.user.deleteMany({ where: { clerkUserId: data.id } });
    return NextResponse.json({ data: { deleted: true } });
  }

  return NextResponse.json({ data: { ignored: true } });
}
