import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { issueDistrictInvoice } from '@/lib/super-admin';
import { withApiHandler } from '@/lib/api-handler';

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

export const POST = withApiHandler(async (req, ctx) => {
  const actor = await requireRole(['PLATFORM_ADMIN']);
  const body = requestSchema.parse(await req.json());

  const invoice = await issueDistrictInvoice({
    tenantId: ctx.params.tenantId,
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
});
