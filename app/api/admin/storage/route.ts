// Admin Storage (GCS) API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  bucket,
  uploadToGCS,
  downloadFromGCS,
  deleteFromGCS,
  fileExistsInGCS,
} from '@/lib/gcs';

// GET - Get storage configuration and stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get configuration (mask sensitive values)
    const config = {
      projectId: process.env.GCS_PROJECT_ID || 'Not configured',
      bucketName: process.env.GCS_BUCKET_NAME || 'Not configured',
      clientEmail: process.env.GCS_CLIENT_EMAIL
        ? maskEmail(process.env.GCS_CLIENT_EMAIL)
        : 'Not configured',
      privateKeyConfigured: !!process.env.GCS_PRIVATE_KEY,
    };

    // Get storage stats from database
    const storageStats = await prisma.photo.aggregate({
      _sum: { fileSize: true },
      _count: { id: true },
    });

    const totalBytes = storageStats._sum.fileSize || 0;
    const photoCount = storageStats._count.id || 0;

    // Calculate averages
    const avgFileSize = photoCount > 0 ? Math.round(totalBytes / photoCount) : 0;

    // Get file type distribution
    const typeDistribution = await prisma.photo.groupBy({
      by: ['mimeType'],
      _count: { id: true },
      _sum: { fileSize: true },
    });

    return NextResponse.json({
      config,
      stats: {
        totalBytes,
        totalMB: Math.round(totalBytes / (1024 * 1024) * 100) / 100,
        totalGB: Math.round(totalBytes / (1024 * 1024 * 1024) * 100) / 100,
        photoCount,
        avgFileSize,
        avgFileSizeMB: Math.round(avgFileSize / (1024 * 1024) * 100) / 100,
      },
      typeDistribution: typeDistribution.map((t) => ({
        mimeType: t.mimeType,
        count: t._count.id,
        totalBytes: t._sum.fileSize || 0,
        totalMB: Math.round((t._sum.fileSize || 0) / (1024 * 1024) * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('Error fetching storage info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch storage information' },
      { status: 500 }
    );
  }
}

// POST - Test GCS connectivity
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { action } = body;

    if (action === 'test-connection') {
      return await testConnection();
    }

    if (action === 'test-upload') {
      return await testUpload();
    }

    if (action === 'test-full') {
      return await testFullCycle();
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in storage test:', error);
    return NextResponse.json(
      { error: 'Storage test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Test basic bucket connection
async function testConnection() {
  const startTime = Date.now();

  try {
    // Try to get bucket metadata
    const [metadata] = await bucket.getMetadata();
    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      test: 'connection',
      message: 'Successfully connected to GCS bucket',
      details: {
        bucketName: metadata.name,
        location: metadata.location,
        storageClass: metadata.storageClass,
        timeCreated: metadata.timeCreated,
      },
      elapsedMs: elapsed,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      test: 'connection',
      message: 'Failed to connect to GCS bucket',
      error: error instanceof Error ? error.message : 'Unknown error',
      elapsedMs: elapsed,
    }, { status: 500 });
  }
}

// Test upload capability
async function testUpload() {
  const startTime = Date.now();
  const testFileName = `_test/connectivity-test-${Date.now()}.txt`;
  const testContent = `GCS connectivity test - ${new Date().toISOString()}`;

  try {
    // Upload test file
    await uploadToGCS(testFileName, Buffer.from(testContent), 'text/plain');

    // Verify file exists
    const exists = await fileExistsInGCS(testFileName);
    if (!exists) {
      throw new Error('File upload succeeded but file not found');
    }

    // Clean up
    await deleteFromGCS(testFileName);

    const elapsed = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      test: 'upload',
      message: 'Successfully uploaded and deleted test file',
      elapsedMs: elapsed,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;

    // Try to clean up if possible
    try {
      await deleteFromGCS(testFileName);
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.json({
      success: false,
      test: 'upload',
      message: 'Upload test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      elapsedMs: elapsed,
    }, { status: 500 });
  }
}

// Test full upload/download/delete cycle
async function testFullCycle() {
  const startTime = Date.now();
  const testFileName = `_test/full-cycle-test-${Date.now()}.txt`;
  const testContent = `Full cycle test - ${new Date().toISOString()}\nRandom: ${Math.random()}`;
  const results: { step: string; success: boolean; elapsedMs: number; error?: string }[] = [];

  try {
    // Step 1: Upload
    let stepStart = Date.now();
    await uploadToGCS(testFileName, Buffer.from(testContent), 'text/plain');
    results.push({ step: 'upload', success: true, elapsedMs: Date.now() - stepStart });

    // Step 2: Check exists
    stepStart = Date.now();
    const exists = await fileExistsInGCS(testFileName);
    if (!exists) throw new Error('File not found after upload');
    results.push({ step: 'exists', success: true, elapsedMs: Date.now() - stepStart });

    // Step 3: Download
    stepStart = Date.now();
    const downloaded = await downloadFromGCS(testFileName);
    const downloadedContent = downloaded.toString('utf-8');
    if (downloadedContent !== testContent) {
      throw new Error('Downloaded content does not match uploaded content');
    }
    results.push({ step: 'download', success: true, elapsedMs: Date.now() - stepStart });

    // Step 4: Delete
    stepStart = Date.now();
    await deleteFromGCS(testFileName);
    results.push({ step: 'delete', success: true, elapsedMs: Date.now() - stepStart });

    // Step 5: Verify deleted
    stepStart = Date.now();
    const stillExists = await fileExistsInGCS(testFileName);
    if (stillExists) throw new Error('File still exists after deletion');
    results.push({ step: 'verify-deleted', success: true, elapsedMs: Date.now() - stepStart });

    const elapsed = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      test: 'full-cycle',
      message: 'All storage operations completed successfully',
      results,
      totalElapsedMs: elapsed,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;

    // Try to clean up
    try {
      await deleteFromGCS(testFileName);
    } catch {
      // Ignore
    }

    return NextResponse.json({
      success: false,
      test: 'full-cycle',
      message: 'Full cycle test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      totalElapsedMs: elapsed,
    }, { status: 500 });
  }
}

// Helper to mask email addresses
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 4
    ? `${local.slice(0, 2)}***${local.slice(-2)}`
    : '***';
  return `${maskedLocal}@${domain}`;
}
