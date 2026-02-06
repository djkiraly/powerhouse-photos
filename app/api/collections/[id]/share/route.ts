// Share Collection API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserById } from '@/lib/users';
import { slugify } from '@/lib/slug';
import { generateShareToken } from '@/lib/share-token';
import { logAudit } from '@/lib/audit';

// POST - Generate share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse optional expiration
    let expiresInDays: number | null = null;
    try {
      const body = await request.json();
      if (body.expiresInDays && typeof body.expiresInDays === 'number' && body.expiresInDays > 0) {
        expiresInDays = body.expiresInDays;
      }
    } catch {
      // No body or invalid JSON is fine - no expiration
    }

    // Get user info for slug
    const user = await getUserById(session.user.id);
    const userSlug = slugify(user?.name || 'user');
    const collectionSlug = slugify(collection.name);
    const shareToken = generateShareToken();
    const shareExpiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.collection.update({
      where: { id },
      data: {
        slug: collectionSlug,
        userSlug,
        shareToken,
        shareExpiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const shareUrl = `${baseUrl}/${userSlug}/${collectionSlug}?token=${shareToken}`;

    await logAudit({
      action: 'COLLECTION_SHARE_CREATE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'Collection',
      resourceId: id,
      details: { shareUrl, expiresAt: shareExpiresAt?.toISOString() ?? null },
    });

    return NextResponse.json({
      shareUrl,
      shareToken,
      expiresAt: shareExpiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke share link
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

    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.collection.update({
      where: { id },
      data: {
        slug: null,
        userSlug: null,
        shareToken: null,
        shareExpiresAt: null,
      },
    });

    await logAudit({
      action: 'COLLECTION_SHARE_REVOKE',
      userId: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      resourceType: 'Collection',
      resourceId: id,
    });

    return NextResponse.json({ message: 'Share link revoked' });
  } catch (error) {
    console.error('Error revoking share link:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
