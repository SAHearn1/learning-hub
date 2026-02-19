import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import type { UserRole } from '@prisma/client';
import { db } from '@/lib/db';

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;
const WEBHOOK_REPLAY_TTL_MS = 10 * 60 * 1000;
const processedWebhookIds = new Map<string, number>();

type ProvisionableRole =
  | 'STUDENT'
  | 'EDUCATOR'
  | 'PARENT'
  | 'SCHOOL_ADMIN'
  | 'DISTRICT_ADMIN'
  | 'PLATFORM_ADMIN';

const VALID_ROLES = new Set<ProvisionableRole>([
  'STUDENT',
  'EDUCATOR',
  'PARENT',
  'SCHOOL_ADMIN',
  'DISTRICT_ADMIN',
  'PLATFORM_ADMIN',
]);

type ClerkWebhookEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
    public_metadata?: {
      role?: ProvisionableRole;
      tenantId?: string;
      schoolId?: string;
    };
    unsafe_metadata?: {
      gradeLevel?: number;
      learningPreferences?: unknown;
    };
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const timestampMs = Number(svixTimestamp) * 1000;
  if (!Number.isFinite(timestampMs)) {
    return NextResponse.json({ error: 'Invalid svix timestamp' }, { status: 400 });
  }

  const now = Date.now();
  pruneReplayCache(now);

  if (Math.abs(now - timestampMs) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
    return NextResponse.json({ error: 'Stale svix timestamp' }, { status: 400 });
  }

  if (processedWebhookIds.has(svixId)) {
    return NextResponse.json({ error: 'Duplicate webhook event' }, { status: 409 });
  }

  const body = await req.text();
  const webhook = new Webhook(webhookSecret);

  let event: ClerkWebhookEvent;
  try {
    event = webhook.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    processedWebhookIds.set(svixId, now + WEBHOOK_REPLAY_TTL_MS);

    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;
      case 'user.updated':
        await handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

function pruneReplayCache(now: number) {
  for (const [id, expiresAt] of processedWebhookIds.entries()) {
    if (expiresAt <= now) {
      processedWebhookIds.delete(id);
    }
  }
}

function parseRole(input?: string): UserRole | null {
  if (!input) return null;
  if (!VALID_ROLES.has(input as ProvisionableRole)) return null;
  return input as UserRole;
}

async function resolveTenantId(candidate?: string): Promise<string> {
  if (!candidate) {
    return getDefaultTenantId();
  }

  const tenant = await db.tenant.findUnique({ where: { id: candidate }, select: { id: true } });
  return tenant?.id ?? (await getDefaultTenantId());
}

async function ensureRoleProfile(
  userId: string,
  role: UserRole,
  unsafe?: ClerkWebhookEvent['data']['unsafe_metadata'],
) {
  if (role === 'STUDENT') {
    await db.student.upsert({
      where: { userId },
      update: {
        gradeLevel: typeof unsafe?.gradeLevel === 'number' ? unsafe.gradeLevel : 6,
        learningPreferences: unsafe?.learningPreferences ?? {},
      },
      create: {
        userId,
        gradeLevel: typeof unsafe?.gradeLevel === 'number' ? unsafe.gradeLevel : 6,
        learningPreferences: unsafe?.learningPreferences ?? {},
        regulationProfile: {
          dysregulationTriggers: [],
          calmingStrategies: [],
          preferredBreakDuration: 5,
        },
      },
    });
    return;
  }

  if (role === 'EDUCATOR') {
    await db.educator.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        certifications: [],
        specializations: [],
      },
    });
    return;
  }

  if (role === 'PARENT') {
    await db.parent.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        childrenIds: [],
        communicationPrefs: {
          emailNotifications: true,
          smsNotifications: false,
        },
      },
    });
  }
}

async function handleUserCreated(data: ClerkWebhookEvent['data']) {
  const email = data.email_addresses[0]?.email_address;
  if (!email) {
    throw new Error(`No email provided for Clerk user ${data.id}`);
  }

  const role = parseRole(data.public_metadata?.role) ?? 'STUDENT';
  const tenantId = await resolveTenantId(data.public_metadata?.tenantId);
  const schoolId = data.public_metadata?.schoolId ?? null;

  const existingUser = await db.user.findUnique({
    where: { clerkUserId: data.id },
  });

  if (existingUser) {
    console.log('User already exists, skipping:', data.id);
    return;
  }

  const user = await db.user.create({
    data: {
      clerkUserId: data.id,
      tenantId,
      schoolId,
      email,
      firstName: data.first_name ?? 'User',
      lastName: data.last_name ?? '',
      role,
    },
  });

  await ensureRoleProfile(user.id, role, data.unsafe_metadata);

  console.log('User created successfully:', user.id);
}

async function handleUserUpdated(data: ClerkWebhookEvent['data']) {
  const user = await db.user.findUnique({
    where: { clerkUserId: data.id },
  });

  if (!user) {
    console.error('User not found for update:', data.id);
    return;
  }

  const incomingRole = parseRole(data.public_metadata?.role);
  const updateData: {
    email: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    tenantId?: string;
    schoolId?: string | null;
  } = {
    email: data.email_addresses[0]?.email_address ?? user.email,
    firstName: data.first_name ?? user.firstName,
    lastName: data.last_name ?? user.lastName,
  };

  if (incomingRole) {
    updateData.role = incomingRole;
  }

  if (data.public_metadata?.tenantId) {
    updateData.tenantId = data.public_metadata.tenantId;
  }

  if (data.public_metadata && Object.prototype.hasOwnProperty.call(data.public_metadata, 'schoolId')) {
    updateData.schoolId = data.public_metadata.schoolId ?? null;
  }

  await db.user.update({
    where: { id: user.id },
    data: updateData,
  });

  if (incomingRole) {
    await ensureRoleProfile(user.id, incomingRole, data.unsafe_metadata);
  }

  console.log('User updated successfully:', user.id);
}
async function handleUserDeleted(data: ClerkWebhookEvent['data']) {
  const user = await db.user.findUnique({
    where: { clerkUserId: data.id },
  });

  if (!user) {
    console.log('User not found for deletion:', data.id);
    return;
  }

  await db.user.delete({
    where: { id: user.id },
  });

  console.log('User deleted successfully:', user.id);
}

async function getDefaultTenantId(): Promise<string> {
  let tenant = await db.tenant.findFirst({
    where: { slug: 'default' },
  });

  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: 'Default Tenant',
        slug: 'default',
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE',
      },
    });
  }

  return tenant.id;
}

