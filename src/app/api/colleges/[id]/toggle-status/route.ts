import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { isActive } = await request.json();

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Check if college exists
    const existingCollege = await prisma.college.findUnique({
      where: { id }
    });

    if (!existingCollege) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    // Update college status
    const updatedCollege = await prisma.college.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json({
      success: true,
      message: `College ${isActive ? 'activated' : 'deactivated'} successfully`,
      college: {
        id: updatedCollege.id,
        name: updatedCollege.name,
        isActive: updatedCollege.isActive
      }
    });

  } catch (error) {
    console.error('Toggle status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
