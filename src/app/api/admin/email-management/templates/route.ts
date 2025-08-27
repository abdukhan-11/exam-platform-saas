import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For now, return mock template data since we don't have a template table yet
    // In a real implementation, this would query a database table
    const templates = [
      {
        id: '1',
        name: 'Welcome Email',
        subject: 'Welcome to {collegeName}!',
        type: 'transactional' as const,
        status: 'active' as const,
        lastModified: new Date('2024-01-01'),
        usageCount: 1250
      },
      {
        id: '2',
        name: 'Password Reset',
        subject: 'Password Reset Request',
        type: 'transactional' as const,
        status: 'active' as const,
        lastModified: new Date('2024-01-15'),
        usageCount: 89
      },
      {
        id: '3',
        name: 'Email Verification',
        subject: 'Verify Your Email Address',
        type: 'transactional' as const,
        status: 'active' as const,
        lastModified: new Date('2024-01-10'),
        usageCount: 567
      },
      {
        id: '4',
        name: 'User Invitation',
        subject: 'You\'ve been invited to join {collegeName}',
        type: 'transactional' as const,
        status: 'active' as const,
        lastModified: new Date('2024-01-20'),
        usageCount: 234
      },
      {
        id: '5',
        name: 'Exam Results',
        subject: 'Your exam results are ready',
        type: 'notification' as const,
        status: 'active' as const,
        lastModified: new Date('2024-01-25'),
        usageCount: 1890
      },
      {
        id: '6',
        name: 'System Maintenance',
        subject: 'Scheduled Maintenance Notice',
        type: 'notification' as const,
        status: 'active' as const,
        lastModified: new Date('2024-01-30'),
        usageCount: 45
      },
      {
        id: '7',
        name: 'Feature Announcement',
        subject: 'New features available!',
        type: 'marketing' as const,
        status: 'draft' as const,
        lastModified: new Date('2024-02-01'),
        usageCount: 0
      },
      {
        id: '8',
        name: 'Newsletter',
        subject: 'Monthly Platform Update',
        type: 'marketing' as const,
        status: 'inactive' as const,
        lastModified: new Date('2024-01-28'),
        usageCount: 156
      }
    ];

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
