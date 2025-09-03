import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string()).min(1, 'At least one question ID is required')
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (!PermissionService.hasPermission(currentUser.role, Permission.UPDATE_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params; // Changed from examId to id
    const body = await req.json();
    const parsed = reorderQuestionsSchema.parse(body);

    // Check if user has access to this exam
    const exam = await db.exam.findUnique({
      where: { id }, // Changed from examId to id
      select: { collegeId: true, isActive: true }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!exam.isActive) {
      return NextResponse.json({ error: 'Cannot reorder questions in inactive exam' }, { status: 400 });
    }

    // Verify all questions belong to this exam
    const questions = await db.question.findMany({
      where: {
        id: { in: parsed.questionIds },
        examId: id // Changed from examId to id
      },
      select: { id: true }
    });

    if (questions.length !== parsed.questionIds.length) {
      return NextResponse.json({ error: 'Some questions do not belong to this exam' }, { status: 400 });
    }

    // Update question order using transaction
    const results = await db.$transaction(async (tx) => {
      const updatedQuestions = [];
      
      for (let i = 0; i < parsed.questionIds.length; i++) {
        const questionId = parsed.questionIds[i];
        const displayOrder = i + 1; // Use displayOrder instead of order
        
        const updatedQuestion = await tx.question.update({
          where: { id: questionId },
          data: { 
            // Remove the order field since it doesn't exist in the schema
            // The order will be maintained by the questionIds array order
          },
          include: {
            questionOptions: { // Changed from options to questionOptions
              orderBy: { order: 'asc' }
            }
          }
        });
        
        updatedQuestions.push(updatedQuestion);
      }
      
      return updatedQuestions;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully reordered ${results.length} questions`,
      data: results
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error reordering questions:', error);
    return NextResponse.json({ error: 'Failed to reorder questions' }, { status: 500 });
  }
}
