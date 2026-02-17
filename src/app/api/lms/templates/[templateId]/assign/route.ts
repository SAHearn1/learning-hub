import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';
import { appendImmutableAuditLog } from '@/lib/audit';

const assignTemplateSchema = z.object({
  classId: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  published: z.boolean().default(false),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators can assign 5R templates');
  }

  const { templateId } = await ctx.params;
  const body = assignTemplateSchema.parse(await req.json());

  // Verify template exists and belongs to tenant
  const template = await db.fiveRTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError('Template not found');
  if (template.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  // Verify class exists and belongs to tenant
  const cls = await db.class.findUnique({ where: { id: body.classId } });
  if (!cls) throw new NotFoundError('Class not found');
  if (cls.tenantId !== user.tenantId) throw new ForbiddenError('Access denied');

  // Create assignment from template
  const assignment = await db.assignment.create({
    data: {
      tenantId: user.tenantId,
      classId: body.classId,
      createdById: user.id,
      title: `5R Session: ${template.name}`,
      description: template.description,
      type: 'FIVE_R_SESSION',
      templateId,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      points: 100,
      rubric: (template.phases as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      published: body.published,
    },
  });

  await appendImmutableAuditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'ASSIGN_5R_TEMPLATE',
    resource: 'Assignment',
    resourceId: assignment.id,
    metadata: { templateId, classId: body.classId },
  });

  return NextResponse.json({ data: assignment }, { status: 201 });
});
