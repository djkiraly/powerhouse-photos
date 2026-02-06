// Single Team Tag API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// DELETE team tag
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

    // Fetch the tag with associated photo to verify ownership
    const tag = await prisma.photoTeamTag.findUnique({
      where: { id },
      include: { photo: true },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Only allow deletion if user owns the photo or is admin
    if (tag.photo.uploadedById !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.photoTeamTag.delete({
      where: { id },
    });

    // Log audit event
    await logAudit({
      action: 'TEAM_TAG_DELETE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'PhotoTeamTag',
      resourceId: id,
      details: { photoId: tag.photoId, teamId: tag.teamId },
    });

    return NextResponse.json({ message: 'Team tag removed successfully' });
  } catch (error) {
    console.error('Error deleting team tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete team tag' },
      { status: 500 }
    );
  }
}
