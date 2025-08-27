import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth-options';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { college: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // Get all colleges with subscription information
    const colleges = await prisma.college.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        isActive: true,
        createdAt: true,
        users: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to match frontend expectations
    const subscriptions = colleges.map(college => ({
      id: college.id,
      college: college.name,
      plan: college.subscriptionStatus,
      status: getSubscriptionStatus(college.subscriptionStatus, college.subscriptionExpiry),
      amount: getSubscriptionAmount(college.subscriptionStatus),
      currency: 'USD',
      billingCycle: 'monthly',
      nextBilling: college.subscriptionExpiry ? college.subscriptionExpiry.toISOString().split('T')[0] : null,
      users: college.users.length,
      features: getSubscriptionFeatures(college.subscriptionStatus),
      createdAt: college.createdAt.toISOString().split('T')[0],
      lastPayment: null // TODO: Integrate with payment system
    }));

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Subscriptions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { college: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { collegeId, plan, amount, billingCycle, users } = body;

    if (!collegeId || !plan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update college subscription
    const updatedCollege = await prisma.college.update({
      where: { id: collegeId },
      data: {
        subscriptionStatus: plan,
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      }
    });

    return NextResponse.json({ 
      message: 'Subscription updated successfully',
      college: updatedCollege
    });
  } catch (error) {
    console.error('Subscription update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { college: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { subscriptionId, status, plan, amount, billingCycle } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
    }

    // Find college by subscription ID (in this case, subscription ID is college ID)
    const college = await prisma.college.findUnique({
      where: { id: subscriptionId }
    });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    // Update subscription
    const updateData: any = {};
    
    if (status) {
      updateData.isActive = status === 'active';
      if (status === 'expired') {
        updateData.subscriptionStatus = 'EXPIRED';
      }
    }
    
    if (plan) {
      updateData.subscriptionStatus = plan;
    }

    const updatedCollege = await prisma.college.update({
      where: { id: subscriptionId },
      data: updateData
    });

    return NextResponse.json({ 
      message: 'Subscription updated successfully',
      college: updatedCollege
    });
  } catch (error) {
    console.error('Subscription update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getSubscriptionStatus(status: string, expiry?: Date | null): string {
  if (status === 'EXPIRED' || (expiry && expiry < new Date())) {
    return 'expired';
  }
  if (status === 'ACTIVE') {
    return 'active';
  }
  if (status === 'TRIAL') {
    return 'pending';
  }
  return 'pending';
}

function getSubscriptionAmount(status: string): number {
  switch (status) {
    case 'TRIAL': return 0;
    case 'BASIC': return 99;
    case 'STANDARD': return 199;
    case 'PREMIUM': return 299;
    case 'ENTERPRISE': return 599;
    default: return 99;
  }
}

function getSubscriptionFeatures(status: string): string[] {
  switch (status) {
    case 'TRIAL':
      return ['Basic Features', '5 Users', 'Email Support'];
    case 'BASIC':
      return ['Basic Features', '50 Users', 'Email Support'];
    case 'STANDARD':
      return ['Basic Analytics', '200 Users', 'Email Support'];
    case 'PREMIUM':
      return ['Advanced Analytics', 'API Access', 'Priority Support'];
    case 'ENTERPRISE':
      return ['Custom Features', 'Unlimited Users', 'Dedicated Support'];
    default:
      return ['Basic Features'];
  }
}
