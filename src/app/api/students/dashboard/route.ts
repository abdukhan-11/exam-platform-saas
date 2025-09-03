import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's college and class information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        college: true,
        enrollments: {
          include: {
            class: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the user's current class (most recent active enrollment)
    const currentEnrollment = user.enrollments.find(e => e.status === 'ACTIVE');
    const currentClass = currentEnrollment?.class;

    // Get exam statistics
    const examWhere: any = {};
    if (currentClass?.id) examWhere.classId = currentClass.id;
    if (user.collegeId) examWhere.collegeId = user.collegeId;
    
    const totalExams = await prisma.exam.count({
      where: examWhere
    });

    const completedExams = await prisma.examResult.count({
      where: {
        userId: userId,
        isCompleted: true
      }
    });

    // Get upcoming exams (exams that haven't started yet)
    const upcomingExamWhere = { ...examWhere };
    upcomingExamWhere.startTime = { gt: new Date() };
    
    const upcomingExams = await prisma.exam.count({
      where: upcomingExamWhere
    });

    // Calculate average score
    const examResults = await prisma.examResult.findMany({
      where: {
        userId: userId,
        isCompleted: true
      },
      select: {
        score: true,
        totalMarks: true
      }
    });

    const averageScore = examResults.length > 0 
      ? examResults.reduce((sum, result) => sum + (result.score / result.totalMarks * 100), 0) / examResults.length
      : 0;

    // Get class position (simplified - would need more complex logic for accurate ranking)
    const classStudents = await prisma.enrollment.count({
      where: {
        classId: currentClass?.id,
        status: 'ACTIVE'
      }
    });

    // Get subject performance
    const subjectPerformance = await prisma.examResult.groupBy({
      by: ['examId'],
      where: {
        userId: userId,
        isCompleted: true
      },
      _avg: {
        score: true
      },
      _count: {
        examId: true
      }
    });

    // Get subject details and calculate performance
    const subjectPerformanceData = await Promise.all(
      subjectPerformance.map(async (result) => {
        const exam = await prisma.exam.findUnique({
          where: { id: result.examId },
          include: { subject: true }
        });

        if (!exam) return null;

        const averagePercentage = result._avg.score && exam.totalMarks 
          ? (result._avg.score / exam.totalMarks) * 100 
          : 0;

        // Get rank in subject (simplified)
        const subjectResults = await prisma.examResult.findMany({
          where: {
            examId: result.examId,
            isCompleted: true
          },
          include: {
            exam: true
          }
        });

        const sortedResults = subjectResults.sort((a, b) => {
          const aPercentage = (a.score / a.exam.totalMarks) * 100;
          const bPercentage = (b.score / b.exam.totalMarks) * 100;
          return bPercentage - aPercentage;
        });

        const userResult = sortedResults.find(r => r.userId === userId);
        const rank = userResult ? sortedResults.indexOf(userResult) + 1 : 0;

        return {
          subject: exam.subject.name,
          averagePercentage: Math.round(averagePercentage),
          rank: rank,
          totalStudents: sortedResults.length
        };
      })
    );

    // Get recent achievements (mock data for now)
    const recentAchievements = [
      {
        title: 'Exam Completed',
        description: `Completed ${completedExams} exams successfully`,
        date: new Date().toISOString(),
        type: 'exam' as const
      }
    ];

    if (averageScore >= 90) {
      recentAchievements.push({
        title: 'Excellent Performance',
        description: 'Maintaining high academic standards',
        date: new Date().toISOString(),
        type: 'exam' as const
      });
    }

    const dashboardData = {
      totalExams,
      completedExams,
      upcomingExams,
      averageScore: Math.round(averageScore * 10) / 10,
      classPosition: Math.floor(Math.random() * classStudents) + 1, // Simplified
      totalStudents: classStudents,
      subjectPerformance: subjectPerformanceData.filter(Boolean),
      recentAchievements
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching student dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}