import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';
import { z } from 'zod';

const importQuestionsSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  questions: z.array(z.object({
    text: z.string().min(1).max(2000),
    type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
    marks: z.number().min(1).max(100),
    correctAnswer: z.string().optional(),
    options: z.array(z.object({
      text: z.string().min(1),
      isCorrect: z.boolean().optional().default(false)
    })).optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().default('MEDIUM'),
    explanation: z.string().max(1000).optional()
  })).min(1).max(100)
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
    const parsed = importQuestionsSchema.parse(body);

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

    // Import questions using transaction
    const results = await db.$transaction(async (tx) => {
      const importedQuestions = [];
      
      for (const questionData of parsed.questions) {
        const question = await tx.question.create({
          data: {
            examId: parsed.examId,
            text: questionData.text,
            type: questionData.type,
            marks: questionData.marks,
            correctAnswer: questionData.correctAnswer || '',
            difficulty: questionData.difficulty,
            explanation: questionData.explanation,
            options: {
              create: questionData.options?.map((option: any) => ({
                text: option.text,
                isCorrect: option.isCorrect || false
              })) || []
            }
          },
          include: {
            questionOptions: true
          }
        });
        
        importedQuestions.push(question);
      }
      
      return importedQuestions;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${results.length} questions`,
      data: results,
      count: results.length
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.issues,
        message: 'Please check your import data format'
      }, { status: 400 });
    }
    console.error('Error importing questions:', error);
    return NextResponse.json({ error: 'Failed to import questions' }, { status: 500 });
  }
}

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
    const format = url.searchParams.get('format') || 'json';

    if (!examId) {
      return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
    }

    // Check if user has access to this exam
    const exam = await db.exam.findUnique({
      where: { id: examId },
      select: { collegeId: true, title: true }
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const questions = await db.question.findMany({
      where: { examId },
      include: {
        questionOptions: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(questions);
      const filename = `${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}_questions.csv`;
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } else {
      // Return JSON format
      const filename = `${exam.title.replace(/[^a-zA-Z0-9]/g, '_')}_questions.json`;
      
      return new NextResponse(JSON.stringify(questions, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

  } catch (error: any) {
    console.error('Error exporting questions:', error);
    return NextResponse.json({ error: 'Failed to export questions' }, { status: 500 });
  }
}

function convertToCSV(questions: any[]): string {
  const headers = [
    'Question Text',
    'Type',
    'Marks',
    'Correct Answer',
    'Difficulty',
    'Explanation',
    'Options'
  ];

  const rows = questions.map(question => [
    `"${question.text.replace(/"/g, '""')}"`,
    question.type,
    question.marks,
    `"${question.correctAnswer.replace(/"/g, '""')}"`,
    question.difficulty,
    `"${(question.explanation || '').replace(/"/g, '""')}"`,
    question.options?.map((opt: any) => `${opt.text}${opt.isCorrect ? ' (Correct)' : ''}`).join(' | ') || ''
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
