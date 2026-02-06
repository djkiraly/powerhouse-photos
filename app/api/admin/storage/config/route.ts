// Admin Storage Config API - Update GCS configuration

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

// PUT - Update GCS configuration in .env file
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, bucketName, clientEmail, privateKey } = body;

    // Validate required fields (at least one should be provided)
    if (!projectId && !bucketName && !clientEmail && !privateKey) {
      return NextResponse.json(
        { error: 'At least one configuration field is required' },
        { status: 400 }
      );
    }

    // Read current .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent: string;

    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: 'Could not read .env file' },
        { status: 500 }
      );
    }

    // Update each GCS-related environment variable
    const updates: Record<string, string> = {};

    if (projectId) {
      updates['GCS_PROJECT_ID'] = projectId;
    }
    if (bucketName) {
      updates['GCS_BUCKET_NAME'] = bucketName;
    }
    if (clientEmail) {
      updates['GCS_CLIENT_EMAIL'] = clientEmail;
    }
    if (privateKey) {
      // Escape the private key for .env file format
      // Replace actual newlines with \n for storage
      const escapedKey = privateKey.replace(/\n/g, '\\n');
      updates['GCS_PRIVATE_KEY'] = `"${escapedKey}"`;
    }

    // Apply updates to env content
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        // Update existing key
        if (key === 'GCS_PRIVATE_KEY') {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent = envContent.replace(regex, `${key}="${value}"`);
        }
      } else {
        // Add new key before the first blank line after GCS section or at end
        const gcsSection = envContent.indexOf('# Google Cloud Storage');
        if (gcsSection !== -1) {
          // Find the end of the GCS section (next blank line or next comment)
          const afterGcs = envContent.slice(gcsSection);
          const lines = afterGcs.split('\n');
          let insertIndex = gcsSection;

          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '' || (lines[i].startsWith('#') && !lines[i].includes('GCS'))) {
              break;
            }
            insertIndex += lines[i].length + 1;
          }

          if (key === 'GCS_PRIVATE_KEY') {
            envContent = envContent.slice(0, insertIndex) + `\n${key}=${value}` + envContent.slice(insertIndex);
          } else {
            envContent = envContent.slice(0, insertIndex) + `\n${key}="${value}"` + envContent.slice(insertIndex);
          }
        } else {
          // Add at the end
          if (key === 'GCS_PRIVATE_KEY') {
            envContent += `\n${key}=${value}`;
          } else {
            envContent += `\n${key}="${value}"`;
          }
        }
      }
    }

    // Write updated .env file
    try {
      await fs.writeFile(envPath, envContent, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: 'Could not write to .env file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved. Restart the server for changes to take effect.',
      updated: Object.keys(updates),
    });
  } catch (error) {
    console.error('Error updating storage config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
