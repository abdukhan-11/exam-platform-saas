import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { db } from '@/lib/db';
import { generateInterventionRecommendations } from '@/lib/exams/advanced-analytics';
import { PermissionService, Permission } from '@/lib/user-management/permissions';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const currentUser = session.user as any;

    // Permission check - only teachers, admins, or the student themselves can access
    const isOwnData = currentUser.id === params.id;
    const hasPermission = PermissionService.hasAnyPermission(currentUser.role, [
      Permission.READ_ANALYTICS,
      Permission.READ_USER
    ]);

    if (!isOwnData && !hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get student and check if exists
    const student = await db.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, collegeId: true }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // College scope check for non-super users
    if (currentUser.role !== 'SUPER_ADMIN' && !isOwnData && student.collegeId !== currentUser.collegeId) {
      return NextResponse.json({ error: 'Forbidden - cross-college access' }, { status: 403 });
    }

    // Generate intervention recommendations
    const recommendations = await generateInterventionRecommendations(params.id);

    // Get additional context for the recommendations
    const recentResults = await db.examResult.findMany({
      where: { userId: params.id },
      orderBy: { endTime: 'desc' },
      take: 5,
      select: {
        percentage: true,
        score: true,
        totalMarks: true,
        endTime: true,
        exam: { select: { title: true, subjectId: true, subject: { select: { name: true } } } }
      }
    });

    // Format recent results for context
    const recentPerformance = recentResults.map(r => ({
      examTitle: r.exam.title,
      subjectName: r.exam.subject?.name || r.exam.subjectId,
      percentage: r.percentage,
      score: r.score,
      totalMarks: r.totalMarks,
      date: r.endTime
    }));

    // Generate additional resources based on recommendation type
    const resources = generateResourceRecommendations(recommendations.recommendationType, recommendations.targetAreas);

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name
      },
      recommendations,
      recentPerformance,
      resources
    });
  } catch (error) {
    console.error('Error generating interventions:', error);
    return NextResponse.json({ error: 'Failed to generate intervention recommendations' }, { status: 500 });
  }
}

/**
 * Generate appropriate resource recommendations based on intervention type and target areas
 */
function generateResourceRecommendations(
  recommendationType: 'urgent' | 'moderate' | 'monitoring',
  targetAreas: string[]
): Array<{ title: string; type: string; description: string; url?: string }> {
  const resources: Array<{ title: string; type: string; description: string; url?: string }> = [];

  // Add general resources based on intervention type
  if (recommendationType === 'urgent') {
    resources.push({
      title: 'Academic Counseling Session',
      type: 'appointment',
      description: 'Schedule a one-on-one session with an academic counselor to discuss performance challenges.'
    });
    resources.push({
      title: 'Study Skills Workshop',
      type: 'workshop',
      description: 'Interactive workshop focusing on effective study techniques and time management.'
    });
  }

  if (recommendationType === 'urgent' || recommendationType === 'moderate') {
    resources.push({
      title: 'Peer Tutoring Program',
      type: 'support',
      description: 'Connect with peer tutors who excel in your challenging subjects.'
    });
  }

  // Add subject-specific resources
  for (const subject of targetAreas) {
    if (subject.toLowerCase().includes('math')) {
      resources.push({
        title: `${subject} Practice Problems`,
        type: 'material',
        description: 'Additional practice problems with step-by-step solutions.',
        url: '/resources/math-practice'
      });
    } else if (subject.toLowerCase().includes('physics')) {
      resources.push({
        title: `${subject} Concept Review`,
        type: 'material',
        description: 'Visual explanations of key physics concepts with interactive simulations.',
        url: '/resources/physics-concepts'
      });
    } else if (subject.toLowerCase().includes('chem')) {
      resources.push({
        title: `${subject} Lab Tutorials`,
        type: 'material',
        description: 'Video tutorials explaining key chemistry concepts and laboratory techniques.',
        url: '/resources/chemistry-labs'
      });
    } else if (subject.toLowerCase().includes('bio')) {
      resources.push({
        title: `${subject} Visual Guides`,
        type: 'material',
        description: 'Illustrated guides to biological processes and systems.',
        url: '/resources/biology-visuals'
      });
    } else if (subject.toLowerCase().includes('eng')) {
      resources.push({
        title: `${subject} Writing Workshop`,
        type: 'workshop',
        description: 'Workshop focusing on improving writing skills and grammar.',
        url: '/resources/english-writing'
      });
    } else {
      resources.push({
        title: `${subject} Study Guide`,
        type: 'material',
        description: 'Comprehensive study guide covering key concepts in this subject.',
        url: `/resources/${subject.toLowerCase().replace(/\s+/g, '-')}`
      });
    }
  }

  return resources;
}
