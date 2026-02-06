// Admin Statistics API

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { authDb, users } from '@/lib/db-auth';
import { count } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch stats in parallel
    const [
      totalPhotos,
      totalPlayers,
      totalCollections,
      totalTags,
      userCountResult,
      recentPhotos,
      storageStats,
    ] = await Promise.all([
      prisma.photo.count(),
      prisma.player.count(),
      prisma.collection.count(),
      prisma.photoTag.count(),
      authDb.select({ count: count() }).from(users),
      prisma.photo.findMany({
        take: 5,
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          uploadedAt: true,
          uploadedById: true,
        },
      }),
      prisma.photo.aggregate({
        _sum: { fileSize: true },
      }),
    ]);

    const totalUsers = userCountResult[0]?.count || 0;
    const totalStorageBytes = storageStats._sum.fileSize || 0;
    const totalStorageMB = Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100;
    const totalStorageGB = Math.round(totalStorageBytes / (1024 * 1024 * 1024) * 100) / 100;

    return NextResponse.json({
      stats: {
        totalUsers,
        totalPhotos,
        totalPlayers,
        totalCollections,
        totalTags,
        totalStorageMB,
        totalStorageGB,
      },
      recentPhotos,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
