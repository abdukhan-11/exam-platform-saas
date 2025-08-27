import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier');
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (tier && tier !== 'all') {
      where.subscriptionTier = tier;
    }

    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    // Fetch colleges with user count
    const colleges = await prisma.college.findMany({
      where,
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    if (format === 'csv') {
      return generateCSV(colleges);
    } else if (format === 'excel') {
      return generateExcel(colleges);
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateCSV(colleges: any[]) {
  const headers = [
    'College Name',
    'Subscription Tier',
    'Status',
    'User Count',
    'Address',
    'Phone',
    'Email',
    'Website',
    'Created At'
  ];

  const csvContent = [
    headers.join(','),
    ...colleges.map(college => [
      `"${college.name}"`,
      college.subscriptionTier || 'N/A',
      college.isActive ? 'Active' : 'Inactive',
      college._count.users || 0,
      `"${college.address || 'N/A'}"`,
      college.phone || 'N/A',
      college.email || 'N/A',
      college.website || 'N/A',
      new Date(college.createdAt).toISOString().split('T')[0]
    ].join(','))
  ].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="colleges-export.csv"'
    }
  });
}

function generateExcel(colleges: any[]) {
  // For now, return CSV as Excel (you can implement proper Excel generation later)
  // You could use libraries like 'xlsx' for proper Excel generation
  return generateCSV(colleges);
}
