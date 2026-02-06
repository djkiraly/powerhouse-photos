// Admin Users API

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { authDb, users } from '@/lib/db-auth';
import { prisma } from '@/lib/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users from auth database
    const allUsers = await authDb
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get photo counts per user from photo database
    const photoCounts = await prisma.photo.groupBy({
      by: ['uploadedById'],
      _count: { id: true },
    });

    const photoCountMap = new Map(
      photoCounts.map((pc) => [pc.uploadedById, pc._count.id])
    );

    // Combine data
    const usersWithStats = allUsers.map((user) => ({
      ...user,
      photoCount: photoCountMap.get(user.id) || 0,
    }));

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
