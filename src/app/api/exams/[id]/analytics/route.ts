import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const currentUser = session.user as any;
    const { id } = await params;

    // Check permissions
    if (!PermissionService.hasPermission(currentUser.role, Permission.READ_EXAM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get exam details
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        subject: true,
        class: true,
        questions: {
          include: {
            answers: {
              include: {
                attempt: {
                  select: {
                    user: {
                      select: {
                        name: true,
                        rollNo: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    
    // Check college access
    if (currentUser.role !== 'SUPER_ADMIN' && exam.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all completed attempts with results
    const attempts = await db.studentExamAttempt.findMany({
      where: { 
        examId: id,
        isCompleted: true
      },
      include: {
        user: {
          select: {
            name: true,
            rollNo: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                text: true,
                marks: true,
                difficulty: true
              }
            }
          }
        }
      },
      orderBy: { score: 'desc' }
    });

    // Calculate overall statistics
    const totalAttempts = attempts.length;
    const scores = attempts.map(a => a.score);
    const percentages = attempts.map(a => a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0);
    
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const averagePercentage = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const highestPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;
    const lowestPercentage = percentages.length > 0 ? Math.min(...percentages) : 0;

    // Calculate grade distribution
    const gradeDistribution = await Promise.all(
      attempts.map(async (attempt) => {
        const percentage = attempt.totalMarks > 0 ? (attempt.score / attempt.totalMarks) * 100 : 0;
        const { resolveGradeByPercentage } = await import('@/lib/exams/grading');
        const gradeResult = await resolveGradeByPercentage(percentage, exam.collegeId);
        return gradeResult.grade;
      })
    );

    const gradeCounts = gradeDistribution.reduce((acc, grade) => {
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate question-wise analytics
    const questionAnalytics = exam.questions.map(question => {
      const questionAnswers = attempts.flatMap(attempt => 
        attempt.answers.filter(answer => answer.questionId === question.id)
      );
      
      const totalAnswers = questionAnswers.length;
      const correctAnswers = questionAnswers.filter(answer => answer.isCorrect).length;
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
      
      // Calculate average time spent
      const timeSpentAnswers = questionAnswers.filter(answer => answer.timeSpent !== null);
      const averageTimeSpent = timeSpentAnswers.length > 0 
        ? timeSpentAnswers.reduce((sum, answer) => sum + (answer.timeSpent || 0), 0) / timeSpentAnswers.length
        : 0;

      return {
        questionId: question.id,
        questionText: question.text,
        marks: question.marks,
        difficulty: question.difficulty,
        totalAnswers,
        correctAnswers,
        accuracy: Math.round(accuracy * 10) / 10,
        averageTimeSpent: Math.round(averageTimeSpent),
        skippedCount: totalAttempts - totalAnswers
      };
    });

    // Calculate performance by difficulty
    const difficultyStats = {
      EASY: { total: 0, correct: 0, accuracy: 0 },
      MEDIUM: { total: 0, correct: 0, accuracy: 0 },
      HARD: { total: 0, correct: 0, accuracy: 0 }
    };

    exam.questions.forEach(question => {
      const questionAnswers = attempts.flatMap(attempt => 
        attempt.answers.filter(answer => answer.questionId === question.id)
      );
      
      const total = questionAnswers.length;
      const correct = questionAnswers.filter(answer => answer.isCorrect).length;
      
      difficultyStats[question.difficulty].total += total;
      difficultyStats[question.difficulty].correct += correct;
    });

    // Calculate accuracy for each difficulty
    Object.keys(difficultyStats).forEach(difficulty => {
      const stats = difficultyStats[difficulty as keyof typeof difficultyStats];
      stats.accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100 * 10) / 10 : 0;
    });

    // Top and bottom performers
    const topPerformers = attempts.slice(0, 5).map(attempt => ({
      name: attempt.user.name,
      rollNo: attempt.user.rollNo,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100 * 10) / 10 : 0,
      timeSpent: attempt.endedAt && attempt.startedAt 
        ? Math.round((attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000 / 60)
        : null
    }));

    const bottomPerformers = attempts.slice(-5).reverse().map(attempt => ({
      name: attempt.user.name,
      rollNo: attempt.user.rollNo,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100 * 10) / 10 : 0,
      timeSpent: attempt.endedAt && attempt.startedAt 
        ? Math.round((attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000 / 60)
        : null
    }));

    const analytics = {
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject.name,
        class: exam.class?.name || 'All Classes',
        totalMarks: exam.totalMarks,
        totalQuestions: exam.questions.length,
        duration: exam.duration
      },
      overallStats: {
        totalAttempts,
        averageScore: Math.round(averageScore * 10) / 10,
        averagePercentage: Math.round(averagePercentage * 10) / 10,
        highestScore,
        lowestScore,
        highestPercentage: Math.round(highestPercentage * 10) / 10,
        lowestPercentage: Math.round(lowestPercentage * 10) / 10,
        passingRate: exam.passingMarks > 0 
          ? Math.round((attempts.filter(a => a.score >= exam.passingMarks).length / totalAttempts) * 100 * 10) / 10
          : 0
      },
      gradeDistribution,
      gradeCounts,
      difficultyStats,
      questionAnalytics,
      topPerformers,
      bottomPerformers,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error generating exam analytics:', error);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
}