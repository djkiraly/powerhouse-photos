// Photo Team Tags API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// POST create team tag
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

    const { photoId, teamId } = body;

    if (!photoId || !teamId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify photo and team exist
    const [photo, team] = await Promise.all([
      prisma.photo.findUnique({ where: { id: photoId } }),
      prisma.team.findUnique({ where: { id: teamId } }),
    ]);

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if tag already exists
    const existingTag = await prisma.photoTeamTag.findUnique({
      where: {
        photoId_teamId: {
          photoId,
          teamId,
        },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 409 }
      );
    }

    const tag = await prisma.photoTeamTag.create({
      data: {
        photoId,
        teamId,
      },
      include: {
        team: true,
      },
    });

    // Log audit event
    await logAudit({
      action: 'TEAM_TAG_CREATE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'PhotoTeamTag',
      resourceId: tag.id,
      details: { photoId, teamId, teamName: tag.team.name },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating team tag:', error);
    return NextResponse.json(
      { error: 'Failed to create team tag' },
      { status: 500 }
    );
  }
}

// PUT bulk team tagging (multiple photos with same teams)
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

    const { photoIds, teamIds } = body;

    if (!photoIds || !teamIds || !Array.isArray(photoIds) || !Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    if (photoIds.length === 0 || teamIds.length === 0) {
      return NextResponse.json(
        { error: 'photoIds and teamIds cannot be empty' },
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

    // Verify all teams exist
    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
    });

    if (teams.length !== teamIds.length) {
      return NextResponse.json(
        { error: 'One or more teams not found' },
        { status: 400 }
      );
    }

    // Create tags for all combinations
    const tags = [];
    for (const photoId of photoIds) {
      for (const teamId of teamIds) {
        tags.push({
          photoId,
          teamId,
        });
      }
    }

    // Use createMany with skipDuplicates
    await prisma.photoTeamTag.createMany({
      data: tags,
      skipDuplicates: true,
    });

    // Log audit event
    await logAudit({
      action: 'TEAM_TAG_BULK_CREATE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'PhotoTeamTag',
      resourceIds: photoIds,
      details: { photoCount: photoIds.length, teamCount: teamIds.length, teamIds },
    });

    return NextResponse.json({ message: 'Team tags created successfully' });
  } catch (error) {
    console.error('Error creating bulk team tags:', error);
    return NextResponse.json(
      { error: 'Failed to create team tags' },
      { status: 500 }
    );
  }
}
