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
  correctAnswer: z.string().min(1, 'Correct answer is required').max(500, 'Answer too long')
});

const essayQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('ESSAY'),
  correctAnswer: z.string().optional(),
  marks: z.number().min(1).max(50, 'Essay questions cannot exceed 50 marks')
});

const createQuestionSchema = z.discriminatedUnion('type', [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  shortAnswerQuestionSchema,
  essayQuestionSchema
]).and(z.object({
  examId: z.string().min(1, 'Exam ID is required')
}));

const updateQuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  text: z.string().min(1).max(2000).optional(),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']).optional(),
  marks: z.number().min(1).max(100).optional(),
  correctAnswer: z.string().optional(),
  options: z.array(questionOptionSchema).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  explanation: z.string().max(1000).optional()
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (!PermissionService.hasPermission(currentUser.role, Permission.READ_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const examId = url.searchParams.get('examId');
    const search = url.searchParams.get('search');
    const type = url.searchParams.get('type');
    const difficulty = url.searchParams.get('difficulty');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    // Check if user has access to this exam
    const exam = await db.exam.findUnique({
      where: { id: examId },
      select: { collegeId: true }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build where clause
    const where: any = { examId };

    if (search) {
      where.OR = [
        { text: { contains: search, mode: 'insensitive' } },
        { explanation: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count for pagination
    const totalCount = await db.question.count({ where });

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    const questions = await db.question.findMany({
      where,
      include: {
        questionOptions: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy,
      skip: offset,
      take: limit
    });

    return NextResponse.json({
      items: questions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

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
    const parsed = createQuestionSchema.parse(body);

    // Check if user has access to this exam
    const exam = await db.exam.findUnique({
      where: { id: parsed.examId },
      select: { collegeId: true, isActive: true }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Allow adding questions regardless of isActive during creation workflow

    // Create question with options
    const question = await db.question.create({
      data: {
        examId: parsed.examId,
        text: parsed.text,
        type: parsed.type,
        marks: parsed.marks,
        correctAnswer: parsed.correctAnswer || '',
        difficulty: parsed.difficulty || 'MEDIUM',
        explanation: parsed.explanation,
        questionOptions: {
          create: (parsed.type === 'MULTIPLE_CHOICE' && parsed.options) ? parsed.options.map((option: any, index: number) => ({
            text: option.text,
            isCorrect: option.isCorrect || false,
            order: index
          })) : []
        }
      },
      include: {
        questionOptions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(question, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (!PermissionService.hasPermission(currentUser.role, Permission.UPDATE_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateQuestionSchema.parse(body);

    // Check if user has access to this question
    const existingQuestion = await db.question.findUnique({
      where: { id: parsed.id },
      include: {
        exam: {
          select: { collegeId: true, isActive: true }
        }
      }
    });

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && existingQuestion.exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!existingQuestion.exam.isActive) {
      return NextResponse.json({ error: 'Cannot update questions in inactive exam' }, { status: 400 });
    }

    // Update question
    const updatedQuestion = await db.question.update({
      where: { id: parsed.id },
      data: {
        text: parsed.text,
        type: parsed.type,
        marks: parsed.marks,
        correctAnswer: parsed.correctAnswer,
        difficulty: parsed.difficulty,
        explanation: parsed.explanation
      },
      include: {

      }
    });

    // Update options if provided
    if (parsed.options) {
      // Delete existing options
      await db.questionOption.deleteMany({
        where: { questionId: parsed.id }
      });

      // Create new options
      await db.questionOption.createMany({
        data: parsed.options.map(option => ({
          questionId: parsed.id,
          text: option.text,
          isCorrect: option.isCorrect || false
        }))
      });

      // Fetch updated question with options
      const finalQuestion = await db.question.findUnique({
        where: { id: parsed.id },
        include: {
  
        }
      });

      return NextResponse.json(finalQuestion);
    }

    return NextResponse.json(updatedQuestion);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}
