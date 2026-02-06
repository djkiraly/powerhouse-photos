// Generate Signed Upload URL

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateUploadSignedUrl } from '@/lib/gcs';
import { generateUniqueFilename } from '@/lib/utils';

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

    const { originalFilename, contentType } = body;

    if (!originalFilename) {
      return NextResponse.json(
        { error: 'Missing filename' },
        { status: 400 }
      );
    }

    if (!contentType) {
      return NextResponse.json(
        { error: 'Missing content type' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(originalFilename);
    const gcsPath = `photos/${uniqueFilename}`;

    // Generate signed URL with exact content type
    const signedUrl = await generateUploadSignedUrl(gcsPath, contentType);

    return NextResponse.json({
      signedUrl,
      gcsPath,
      filename: uniqueFilename,
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
