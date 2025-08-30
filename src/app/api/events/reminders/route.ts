import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { z } from 'zod';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

const reminderSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  reminderTime: z.string().datetime(),
  leadTime: z.number().int().min(0).max(1440).optional(),
  reminderType: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const currentUser = session.user as any;
    if (!PermissionService.hasAnyPermission(currentUser.role, [Permission.READ_CLASS, Permission.READ_SUBJECT])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = reminderSchema.parse(body);

    const event = await db.event.findUnique({ where: { id: parsed.eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (currentUser.role !== 'SUPER_ADMIN' && event.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reminder = await db.eventReminder.create({
      data: {
        eventId: parsed.eventId,
        userId: parsed.userId,
        reminderTime: new Date(parsed.reminderTime),
        leadTime: parsed.leadTime ?? 15,
        reminderType: parsed.reminderType as any,
        collegeId: event.collegeId,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event reminder:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}


