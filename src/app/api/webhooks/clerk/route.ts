import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ValidationError } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

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
export const POST = withApiHandler(async (req, { requestId }) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('CLERK_WEBHOOK_SECRET is not configured');
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AuthenticationError('Missing webhook signature headers');
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
    logger.error('Webhook signature verification failed', error, { requestId });
    throw new AuthenticationError('Invalid webhook signature');
  }

  const { type, data } = event;

  if (type === 'user.created' || type === 'user.updated') {
    try {
      const email = data.email_addresses?.[0]?.email_address;
      if (!email) {
        throw new ValidationError('No email found');
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
      // For webhook processing errors (not signature verification), return 200
      // to prevent retries but log the error for investigation.
      if (error instanceof AuthenticationError || error instanceof ValidationError) {
        throw error;
      }
      logger.error(`Error handling ${type}`, error, { requestId });
      return NextResponse.json({
        data: {
          error: `Failed to ${type === 'user.created' ? 'create' : 'update'} user`,
          logged: true,
        },
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
        },
      });
      return NextResponse.json({
        data: {
          deactivated: true,
          message: 'User deactivated for FERPA compliance',
        },
      });
    } catch (error) {
      logger.error('Error deactivating user', error, { requestId });
      // Return 200 to prevent webhook retries
      return NextResponse.json({
        data: {
          error: 'Failed to deactivate user',
          logged: true,
        },
      });
    }
  }

  return NextResponse.json({ data: { ignored: true } });
});
