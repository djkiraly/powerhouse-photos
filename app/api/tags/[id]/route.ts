// Single Tag API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// DELETE tag
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
    const tag = await prisma.photoTag.findUnique({
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

    await prisma.photoTag.delete({
      where: { id },
    });

    // Log audit event
    await logAudit({
      action: 'PLAYER_TAG_DELETE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'PhotoTag',
      resourceId: id,
      details: { photoId: tag.photoId, playerId: tag.playerId },
    });

    return NextResponse.json({ message: 'Tag removed successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
