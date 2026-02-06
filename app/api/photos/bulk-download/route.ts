// Bulk Download Photos as ZIP

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedUsers } from '@/lib/user-cache';
import { generateDownloadSignedUrl } from '@/lib/gcs';
import archiver from 'archiver';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { photoIds } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid photo IDs' },
        { status: 400 }
      );
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      include: { tags: { include: { player: true } } }
    });

    if (photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos found' },
        { status: 404 }
      );
    }

    // Fetch uploader data
    const uploaderIds = [...new Set(photos.map(p => p.uploadedById))];
    const uploaders = await getCachedUsers(uploaderIds);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    const stream = new ReadableStream({
      async start(controller) {
        archive.on('data', (chunk) => controller.enqueue(chunk));
        archive.on('end', () => controller.close());
        archive.on('error', (err) => controller.error(err));

        // Add photos to archive
        for (const photo of photos) {
          try {
            const signedUrl = await generateDownloadSignedUrl(photo.gcsPath);
            const response = await fetch(signedUrl);
            const buffer = await response.arrayBuffer();
            archive.append(Buffer.from(buffer), { name: photo.originalName });
          } catch (error) {
            console.error(`Error downloading photo ${photo.id}:`, error);
          }
        }

        // Add metadata JSON
        const metadata = photos.map(p => ({
          filename: p.originalName,
          uploadDate: p.uploadedAt,
          uploader: uploaders.get(p.uploadedById)?.name || 'Unknown',
          tags: p.tags.map(t => t.player.name),
        }));
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        await archive.finalize();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="photos-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error creating zip:', error);
    return NextResponse.json(
      { error: 'Failed to create download' },
      { status: 500 }
    );
  }
}
