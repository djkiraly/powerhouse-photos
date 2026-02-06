// Single Photo API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedUsers } from '@/lib/user-cache';
import { deleteFromGCS } from '@/lib/gcs';
import { logAudit } from '@/lib/audit';

// GET single photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        tags: {
          include: { player: true }
        }
      }
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Fetch uploader data
    const uploaders = await getCachedUsers([photo.uploadedById]);
    const photoWithUploader = {
      ...photo,
      uploader: uploaders.get(photo.uploadedById) || null,
    };

    return NextResponse.json(photoWithUploader);
  } catch (error) {
    console.error('Error fetching photo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}

// DELETE photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const photo = await prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Only admins can delete photos
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from GCS
    await deleteFromGCS(photo.gcsPath);
    if (photo.thumbnailPath) {
      await deleteFromGCS(photo.thumbnailPath);
    }

    // Delete from database (cascades to tags and collection photos)
    await prisma.photo.delete({
      where: { id },
    });

    // Log audit event
    await logAudit({
      action: 'PHOTO_DELETE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'Photo',
      resourceId: id,
      details: { originalName: photo.originalName, gcsPath: photo.gcsPath },
    });

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
