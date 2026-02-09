import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { issueDistrictInvoice } from '@/lib/super-admin';

const requestSchema = z.object({
  memo: z.string().max(300).optional(),
  lineItems: z.array(
    z.object({
      description: z.string().min(2).max(280),
      unitAmountCents: z.number().int().positive(),
      quantity: z.number().int().positive().max(100).optional(),
    }),
  ).min(1),
});

export async function POST(request: Request, { params }: { params: { tenantId: string } }) {
  try {
    const actor = await requireRole(['PLATFORM_ADMIN']);
    const body = requestSchema.parse(await request.json());

    const invoice = await issueDistrictInvoice({
      tenantId: params.tenantId,
      actorUserId: actor.id,
      actorEmail: actor.email,
      memo: body.memo,
      lineItems: body.lineItems,
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      status: invoice.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
