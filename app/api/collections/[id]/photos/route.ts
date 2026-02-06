// Collection Photos API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// POST add photo to collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: collectionId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      );
    }

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify photo exists
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Check if photo already in collection
    const existing = await prisma.collectionPhoto.findUnique({
      where: {
        collectionId_photoId: {
          collectionId,
          photoId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Photo already in collection' },
        { status: 409 }
      );
    }

    const collectionPhoto = await prisma.collectionPhoto.create({
      data: {
        collectionId,
        photoId,
      },
    });

    // Log audit event
    await logAudit({
      action: 'COLLECTION_PHOTO_ADD',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'CollectionPhoto',
      resourceId: collectionPhoto.id,
      details: { collectionId, photoId, collectionName: collection.name },
    });

    return NextResponse.json(collectionPhoto, { status: 201 });
  } catch (error) {
    console.error('Error adding photo to collection:', error);
    return NextResponse.json(
      { error: 'Failed to add photo to collection' },
      { status: 500 }
    );
  }
}

// DELETE remove photo from collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: collectionId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      );
    }

    // Verify collection ownership
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.collectionPhoto.delete({
      where: {
        collectionId_photoId: {
          collectionId,
          photoId,
        },
      },
    });

    // Log audit event
    await logAudit({
      action: 'COLLECTION_PHOTO_REMOVE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'CollectionPhoto',
      details: { collectionId, photoId, collectionName: collection.name },
    });

    return NextResponse.json({ message: 'Photo removed from collection' });
  } catch (error) {
    console.error('Error removing photo from collection:', error);
    return NextResponse.json(
      { error: 'Failed to remove photo from collection' },
      { status: 500 }
    );
  }
}
