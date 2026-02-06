// Photos API Routes

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedUsers } from '@/lib/user-cache';
import { uploadToGCS, bucket } from '@/lib/gcs';
import { isValidImageType, isValidFileSize } from '@/lib/utils';
import { parseDate } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import sharp from 'sharp';

// GET all photos with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerIds = searchParams.get('playerIds')?.split(',').filter(Boolean) || [];
    const teamIds = searchParams.get('teamIds')?.split(',').filter(Boolean) || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const uploaderId = searchParams.get('uploaderId');
    const folderId = searchParams.get('folderId');
    const noFolder = searchParams.get('noFolder') === 'true';

    // Validate dates if provided
    const parsedStartDate = startDate ? parseDate(startDate) : null;
    const parsedEndDate = endDate ? parseDate(endDate) : null;

    if (startDate && !parsedStartDate) {
      return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 });
    }

    if (endDate && !parsedEndDate) {
      return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 });
    }

    const whereConditions: Prisma.PhotoWhereInput[] = [];

    // Player filter (with OR logic if multiple players)
    if (playerIds.length > 0) {
      whereConditions.push({
        tags: {
          some: {
            playerId: { in: playerIds },
          },
        },
      });
    }

    // Team filter
    if (teamIds.length > 0) {
      whereConditions.push({
        teamTags: {
          some: {
            teamId: { in: teamIds },
          },
        },
      });
    }

    // Date filter
    if (parsedStartDate || parsedEndDate) {
      whereConditions.push({
        uploadedAt: {
          ...(parsedStartDate && { gte: parsedStartDate }),
          ...(parsedEndDate && { lte: parsedEndDate }),
        },
      });
    }

    // Uploader filter
    if (uploaderId) {
      whereConditions.push({
        uploadedById: uploaderId,
      });
    }

    // Folder filter
    if (folderId) {
      whereConditions.push({
        folderId: folderId,
      });
    } else if (noFolder) {
      whereConditions.push({
        folderId: null,
      });
    }

    const where: Prisma.PhotoWhereInput = whereConditions.length > 0
      ? { AND: whereConditions }
      : {};

    const photos = await prisma.photo.findMany({
      where,
      include: {
        folder: true,
        tags: {
          include: { player: true },
        },
        teamTags: {
          include: { team: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Fetch uploader data from auth database
    const uploaderIds = [...new Set(photos.map(p => p.uploadedById))];
    const uploaders = await getCachedUsers(uploaderIds);

    const photosWithUploaders = photos.map(photo => ({
      ...photo,
      uploader: uploaders.get(photo.uploadedById) || null,
    }));

    return NextResponse.json(photosWithUploaders);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

// POST create photo record after upload
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { gcsPath, originalName, fileSize, mimeType, folderId } = body;

    if (!gcsPath || !originalName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidImageType(mimeType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size
    if (!isValidFileSize(fileSize)) {
      return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 });
    }

    // Validate gcsPath format (must start with photos/ and no path traversal)
    if (!gcsPath.startsWith('photos/') || gcsPath.includes('..')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Download image from GCS
    const [imageBuffer] = await bucket.file(gcsPath).download();

    // Create thumbnail (rotate() auto-rotates based on EXIF orientation)
    const thumbnail = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(400, 400, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail to GCS
    const thumbnailPath = `thumbnails/${gcsPath.split('/').pop()}`;
    await uploadToGCS(thumbnailPath, thumbnail, 'image/jpeg');

    // Save to database
    const photo = await prisma.photo.create({
      data: {
        gcsPath,
        thumbnailPath,
        originalName,
        fileSize,
        mimeType,
        uploadedById: session.user.id,
        folderId: folderId || null,
      },
      include: {
        folder: true,
        tags: {
          include: { player: true },
        },
        teamTags: {
          include: { team: true },
        },
      },
    });

    // Fetch uploader data
    const uploaders = await getCachedUsers([photo.uploadedById]);
    const photoWithUploader = {
      ...photo,
      uploader: uploaders.get(photo.uploadedById) || null,
    };

    // Log audit event
    await logAudit({
      action: 'PHOTO_UPLOAD',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'Photo',
      resourceId: photo.id,
      details: { originalName, fileSize, mimeType },
    });

    return NextResponse.json(photoWithUploader, { status: 201 });
  } catch (error) {
    console.error('Error creating photo:', error);
    return NextResponse.json(
      { error: 'Failed to create photo' },
      { status: 500 }
    );
  }
}
