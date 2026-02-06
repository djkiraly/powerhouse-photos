// Photo Tags API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// POST create tag
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

    const { photoId, playerId } = body;

    if (!photoId || !playerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify photo and player exist
    const [photo, player] = await Promise.all([
      prisma.photo.findUnique({ where: { id: photoId } }),
      prisma.player.findUnique({ where: { id: playerId } }),
    ]);

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check if tag already exists
    const existingTag = await prisma.photoTag.findUnique({
      where: {
        photoId_playerId: {
          photoId,
          playerId,
        },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 409 }
      );
    }

    const tag = await prisma.photoTag.create({
      data: {
        photoId,
        playerId,
      },
      include: {
        player: true,
      },
    });

    // Log audit event
    await logAudit({
      action: 'PLAYER_TAG_CREATE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'PhotoTag',
      resourceId: tag.id,
      details: { photoId, playerId, playerName: tag.player.name },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

// PUT bulk tag (multiple photos with same players)
export async function PUT(request: NextRequest) {
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

    const { photoIds, playerIds } = body;

    if (!photoIds || !playerIds || !Array.isArray(photoIds) || !Array.isArray(playerIds)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    if (photoIds.length === 0 || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'photoIds and playerIds cannot be empty' },
        { status: 400 }
      );
    }

    // Verify all photos exist
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
    });

    if (photos.length !== photoIds.length) {
      return NextResponse.json(
        { error: 'One or more photos not found' },
        { status: 400 }
      );
    }

    // Verify all players exist
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
    });

    if (players.length !== playerIds.length) {
      return NextResponse.json(
        { error: 'One or more players not found' },
        { status: 400 }
      );
    }

    // Create tags for all combinations
    const tags = [];
    for (const photoId of photoIds) {
      for (const playerId of playerIds) {
        tags.push({
          photoId,
          playerId,
        });
      }
    }

    // Use createMany with skipDuplicates
    await prisma.photoTag.createMany({
      data: tags,
      skipDuplicates: true,
    });

    // Log audit event
    await logAudit({
      action: 'PLAYER_TAG_BULK_CREATE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'PhotoTag',
      resourceIds: photoIds,
      details: { photoCount: photoIds.length, playerCount: playerIds.length, playerIds },
    });

    return NextResponse.json({ message: 'Tags created successfully' });
  } catch (error) {
    console.error('Error creating bulk tags:', error);
    return NextResponse.json(
      { error: 'Failed to create tags' },
      { status: 500 }
    );
  }
}
