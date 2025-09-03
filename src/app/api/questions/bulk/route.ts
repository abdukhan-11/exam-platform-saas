import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

// Enhanced validation schemas for different question types
const questionOptionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().optional().default(false)
});

const baseQuestionSchema = z.object({
  text: z.string().min(1, 'Question text is required').max(2000, 'Question text too long'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
  marks: z.number().min(1, 'Marks must be at least 1').max(100, 'Marks cannot exceed 100'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM'),
  explanation: z.string().max(1000, 'Explanation too long').optional()
});

const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('MULTIPLE_CHOICE'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  options: z.array(questionOptionSchema)
    .min(2, 'Multiple choice questions must have at least 2 options')
    .max(6, 'Multiple choice questions cannot have more than 6 options')
    .refine(options => options.some(opt => opt.isCorrect), 'At least one option must be correct')
});

const trueFalseQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('TRUE_FALSE'),
  correctAnswer: z.enum(['true', 'false'])
});

const shortAnswerQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('SHORT_ANSWER'),
  correctAnswer: z.string().min(1, 'Correct answer is required')
});

const essayQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('ESSAY'),
  correctAnswer: z.string().optional(),
  marks: z.number().min(1).max(50, 'Essay questions cannot exceed 50 marks')
});

const questionSchema = z.discriminatedUnion('type', [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  shortAnswerQuestionSchema,
  essayQuestionSchema
]);

const bulkCreateSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  questions: z.array(questionSchema).min(1, 'At least one question is required').max(100, 'Cannot create more than 100 questions at once')
});

const bulkUpdateSchema = z.object({
  questions: z.array(z.object({
    id: z.string().min(1, 'Question ID is required'),
    text: z.string().min(1).max(2000).optional(),
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']).optional(),
    marks: z.number().min(1).max(100).optional(),
    correctAnswer: z.string().optional(),
    options: z.array(questionOptionSchema).optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
    explanation: z.string().max(1000).optional()
  })).min(1).max(100)
});

const bulkDeleteSchema = z.object({
  questionIds: z.array(z.string()).min(1, 'At least one question ID is required').max(100, 'Cannot delete more than 100 questions at once')
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (!PermissionService.hasPermission(currentUser.role, Permission.CREATE_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, ...data } = body;

    let result: any;

    switch (action) {
      case 'create':
        const createData = bulkCreateSchema.parse(data);
        result = await handleBulkCreate(createData, currentUser);
        break;
      case 'update':
        const updateData = bulkUpdateSchema.parse(data);
        result = await handleBulkUpdate(updateData, currentUser);
        break;
      case 'delete':
        const deleteData = bulkDeleteSchema.parse(data);
        result = await handleBulkDelete(deleteData, currentUser);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action. Must be create, update, or delete' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.issues,
        message: 'Please check your input data'
      }, { status: 400 });
    }
    console.error('Error in bulk question operation:', error);
    return NextResponse.json({ 
      error: 'Failed to process bulk operation',
      message: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

async function handleBulkCreate(data: z.infer<typeof bulkCreateSchema>, currentUser: any) {
  // Check if user has access to this exam
  const exam = await db.exam.findUnique({
    where: { id: data.examId },
    select: { collegeId: true, isActive: true }
  });

  if (!exam) {
    throw new Error('Exam not found');
  }

  if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
    throw new Error('Forbidden');
  }

  const results = await db.$transaction(async (tx) => {
    const createdQuestions = [];
    
    for (const questionData of data.questions) {
      const question = await tx.question.create({
        data: {
          examId: data.examId,
          text: questionData.text,
          type: questionData.type,
          marks: questionData.marks,
          correctAnswer: questionData.correctAnswer || '',
          difficulty: questionData.difficulty,
          explanation: questionData.explanation,
          questionOptions: {
            create: (questionData.type === 'MULTIPLE_CHOICE' && (questionData as any).options) ? (questionData as any).options.map((option: any, index: number) => ({
              text: option.text,
              isCorrect: option.isCorrect || false,
              order: index
            })) : []
          }
        },
        include: {
          questionOptions: true
        }
      });
      
      createdQuestions.push(question);
    }
    
    return createdQuestions;
  });

  return {
    success: true,
    message: `Successfully created ${results.length} questions`,
    data: results,
    count: results.length
  };
}

async function handleBulkUpdate(data: z.infer<typeof bulkUpdateSchema>, currentUser: any) {
  const results = await db.$transaction(async (tx) => {
    const updatedQuestions = [];
    
    for (const questionData of data.questions) {
      // Check if user has access to this question
      const existingQuestion = await tx.question.findUnique({
        where: { id: questionData.id },
        include: {
          exam: {
            select: { collegeId: true, isActive: true }
          }
        }
      });

      if (!existingQuestion) {
        throw new Error(`Question with ID ${questionData.id} not found`);
      }

      if (currentUser.role !== 'SUPER_ADMIN' && existingQuestion.exam.collegeId !== currentUser.collegeId) {
        throw new Error(`Forbidden access to question ${questionData.id}`);
      }

      if (!existingQuestion.exam.isActive) {
        throw new Error(`Cannot update questions in inactive exam`);
      }

      // Update question
      const updateData: any = {};
      if (questionData.text !== undefined) updateData.text = questionData.text;
      if (questionData.type !== undefined) updateData.type = questionData.type;
      if (questionData.marks !== undefined) updateData.marks = questionData.marks;
      if (questionData.correctAnswer !== undefined) updateData.correctAnswer = questionData.correctAnswer;
      if (questionData.difficulty !== undefined) updateData.difficulty = questionData.difficulty;
      if (questionData.explanation !== undefined) updateData.explanation = questionData.explanation;

      const updatedQuestion = await tx.question.update({
        where: { id: questionData.id },
        data: updateData,
        include: {
          questionOptions: true
        }
      });

      // Update options if provided
      if (questionData.options) {
        // Delete existing options
        await tx.questionOption.deleteMany({
          where: { questionId: questionData.id }
        });

        // Create new options
        await tx.questionOption.createMany({
          data: questionData.options.map(option => ({
            questionId: questionData.id,
            text: option.text,
            isCorrect: option.isCorrect || false
          }))
        });

        // Fetch updated question with options
        const finalQuestion = await tx.question.findUnique({
          where: { id: questionData.id },
          include: {
            questionOptions: true
          }
        });

        updatedQuestions.push(finalQuestion);
      } else {
        updatedQuestions.push(updatedQuestion);
      }
    }
    
    return updatedQuestions;
  });

  return {
    success: true,
    message: `Successfully updated ${results.length} questions`,
    data: results,
    count: results.length
  };
}

async function handleBulkDelete(data: z.infer<typeof bulkDeleteSchema>, currentUser: any) {
  const results = await db.$transaction(async (tx) => {
    const deletedQuestions = [];
    
    for (const questionId of data.questionIds) {
      // Check if user has access to this question
      const question = await tx.question.findUnique({
        where: { id: questionId },
        include: {
          exam: {
            select: { collegeId: true, isActive: true }
          }
        }
      });

      if (!question) {
        throw new Error(`Question with ID ${questionId} not found`);
      }

      if (currentUser.role !== 'SUPER_ADMIN' && question.exam.collegeId !== currentUser.collegeId) {
        throw new Error(`Forbidden access to question ${questionId}`);
      }

      if (!question.exam.isActive) {
        throw new Error(`Cannot delete questions from inactive exam`);
      }

      // Delete question (this will cascade delete options due to foreign key constraints)
      await tx.question.delete({
        where: { id: questionId }
      });

      deletedQuestions.push({ id: questionId, deleted: true });
    }
    
    return deletedQuestions;
  });

  return {
    success: true,
    message: `Successfully deleted ${results.length} questions`,
    data: results,
    count: results.length
  };
}
