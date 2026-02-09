import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/lib/db';

type ProvisionableRole = 'STUDENT' | 'EDUCATOR' | 'PARENT' | 'SCHOOL_ADMIN' | 'DISTRICT_ADMIN';

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

async function handleUserCreated(data: ClerkWebhookEvent['data']) {
  const email = data.email_addresses[0]?.email_address;
  if (!email) {
    throw new Error(`No email provided for Clerk user ${data.id}`);
  }

  const role = data.public_metadata?.role ?? 'STUDENT';
  const tenantId = data.public_metadata?.tenantId ?? (await getDefaultTenantId());
  const schoolId = data.public_metadata?.schoolId;

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

  if (role === 'STUDENT') {
    await db.student.create({
      data: {
        userId: user.id,
        gradeLevel: data.unsafe_metadata?.gradeLevel ?? 6,
        learningPreferences: data.unsafe_metadata?.learningPreferences ?? {},
        regulationProfile: {
          dysregulationTriggers: [],
          calmingStrategies: [],
          preferredBreakDuration: 5,
        },
      },
    });
  } else if (role === 'EDUCATOR') {
    await db.educator.create({
      data: {
        userId: user.id,
        certifications: [],
        specializations: [],
      },
    });
  } else if (role === 'PARENT') {
    await db.parent.create({
      data: {
        userId: user.id,
        childrenIds: [],
        communicationPrefs: {
          emailNotifications: true,
          smsNotifications: false,
        },
      },
    });
  }

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

  await db.user.update({
    where: { id: user.id },
    data: {
      email: data.email_addresses[0]?.email_address ?? user.email,
      firstName: data.first_name ?? user.firstName,
      lastName: data.last_name ?? user.lastName,
    },
  });

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
