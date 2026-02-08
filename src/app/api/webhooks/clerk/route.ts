import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
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

/**
 * POST /api/webhooks/clerk
 * Handles Clerk webhook events for user lifecycle management
 *
 * Uses Svix signature verification as required by Clerk's webhook security.
 *
 * Supported events:
 * - user.created: Creates User and role-specific profile in database
 * - user.updated: Updates User record with latest data
 * - user.deleted: Soft deletes user for FERPA compliance
 *
 * @returns 200 OK for all cases to prevent retries
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing webhook signature headers' }, { status: 401 });
  }

  let event: ClerkWebhookEvent;
  try {
    const body = await req.text();
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const { type, data } = event;

  if (type === 'user.created' || type === 'user.updated') {
    try {
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
          // Calculate if user is a minor (under 13) based on metadata
          isMinor: (data.public_metadata?.isMinor ?? false) as boolean,
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
    } catch (error) {
      console.error(`Error handling ${type}:`, error);
      // Return 200 to prevent retries, but log the error
      return NextResponse.json({ 
        data: { 
          error: `Failed to ${type === 'user.created' ? 'create' : 'update'} user`,
          logged: true 
        } 
      });
    }
  }

  if (type === 'user.deleted') {
    // FERPA compliance: Don't hard delete user data
    // Instead, we mark the user as deleted by clearing sensitive data
    // and keeping records for audit/compliance purposes
    try {
      await db.user.updateMany({
        where: { clerkUserId: data.id },
        data: {
          email: `deleted_${data.id}@deleted.local`,
          firstName: 'Deleted',
          lastName: 'User',
          // Note: For full FERPA compliance, consider adding an 'isActive' field
          // to the User model and set it to false instead
        },
      });
      return NextResponse.json({ 
        data: { 
          deactivated: true,
          message: 'User deactivated for FERPA compliance' 
        } 
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      // Return 200 to prevent webhook retries
      return NextResponse.json({ 
        data: { 
          error: 'Failed to deactivate user',
          logged: true 
        } 
      });
    }
  }

  return NextResponse.json({ data: { ignored: true } });
}
