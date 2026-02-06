// Admin Photos API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedUsers } from '@/lib/user-cache';
import { deleteFromGCS } from '@/lib/gcs';
import { logAudit } from '@/lib/audit';

// GET - List all photos with admin details
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const uploaderId = searchParams.get('uploaderId');

    const skip = (page - 1) * limit;

    const where = uploaderId ? { uploadedById: uploaderId } : {};

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          tags: {
            include: { player: true },
          },
          _count: {
            select: { collectionPhotos: true },
          },
        },
      }),
      prisma.photo.count({ where }),
    ]);

    // Fetch uploader info
    const uploaderIds = [...new Set(photos.map((p) => p.uploadedById))];
    const uploaders = await getCachedUsers(uploaderIds);

    const photosWithUploaders = photos.map((photo) => ({
      ...photo,
      uploader: uploaders.get(photo.uploadedById) || null,
      collectionsCount: photo._count.collectionPhotos,
    }));

    return NextResponse.json({
      photos: photosWithUploaders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete photos
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { photoIds } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'photoIds array is required' },
        { status: 400 }
      );
    }

    // Fetch photos to get GCS paths
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, gcsPath: true, thumbnailPath: true },
    });

    if (photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos found' },
        { status: 404 }
      );
    }

    // Delete from GCS
    const deletePromises = photos.flatMap((photo) => {
      const promises = [deleteFromGCS(photo.gcsPath)];
      if (photo.thumbnailPath) {
        promises.push(deleteFromGCS(photo.thumbnailPath));
      }
      return promises;
    });

    // Delete files (don't fail if some are missing)
    await Promise.allSettled(deletePromises);

    // Delete from database (cascades to tags and collection photos)
    const result = await prisma.photo.deleteMany({
      where: { id: { in: photoIds } },
    });

    // Log audit event
    await logAudit({
      action: 'PHOTO_BULK_DELETE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'Photo',
      resourceIds: photos.map((p) => p.id),
      details: { deletedCount: result.count },
    });

    return NextResponse.json({
      message: `${result.count} photos deleted successfully`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error deleting photos:', error);
    return NextResponse.json(
      { error: 'Failed to delete photos' },
      { status: 500 }
    );
  }
}
