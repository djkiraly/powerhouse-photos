// Public Share API Route - No authentication required

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidShareToken } from '@/lib/share-token';
import { getCachedUsers } from '@/lib/user-cache';
import { generateDownloadSignedUrl } from '@/lib/gcs';

// GET - Fetch shared collection data (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!isValidShareToken(token)) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { shareToken: token },
      include: {
        photos: {
          include: {
            photo: {
              include: {
                tags: {
                  include: {
                    player: true,
                  },
                },
              },
            },
          },
          orderBy: {
            addedAt: 'desc',
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check expiration
    if (collection.shareExpiresAt && new Date() > collection.shareExpiresAt) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Fetch owner name
    const usersMap = await getCachedUsers([collection.userId]);
    const owner = usersMap.get(collection.userId);

    // Generate signed URLs for all photos
    const photosWithUrls = await Promise.all(
      collection.photos.map(async (cp) => {
        const [imageUrl, thumbnailUrl] = await Promise.all([
          generateDownloadSignedUrl(cp.photo.gcsPath),
          cp.photo.thumbnailPath
            ? generateDownloadSignedUrl(cp.photo.thumbnailPath)
            : null,
        ]);

        return {
          id: cp.photo.id,
          originalName: cp.photo.originalName,
          imageUrl,
          thumbnailUrl,
          tags: cp.photo.tags.map((t) => ({
            id: t.player.id,
            name: t.player.name,
            jerseyNumber: t.player.jerseyNumber,
          })),
        };
      })
    );

    return NextResponse.json({
      name: collection.name,
      description: collection.description,
      ownerName: owner?.name ?? 'Unknown',
      photoCount: collection.photos.length,
      photos: photosWithUrls,
    });
  } catch (error) {
    console.error('Error fetching shared collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared collection' },
      { status: 500 }
    );
  }
}
