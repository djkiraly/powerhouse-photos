// Google Cloud Storage helper functions

import { Storage, type Bucket } from '@google-cloud/storage';

let storage: Storage | null = null;
let _bucket: Bucket | null = null;

function getBucket(): Bucket {
  if (!_bucket) {
    if (!process.env.GCS_PROJECT_ID) {
      throw new Error('Missing required environment variable: GCS_PROJECT_ID');
    }
    if (!process.env.GCS_BUCKET_NAME) {
      throw new Error('Missing required environment variable: GCS_BUCKET_NAME');
    }
    if (!process.env.GCS_CLIENT_EMAIL) {
      throw new Error('Missing required environment variable: GCS_CLIENT_EMAIL');
    }
    if (!process.env.GCS_PRIVATE_KEY) {
      throw new Error('Missing required environment variable: GCS_PRIVATE_KEY');
    }

    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });

    _bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
  }
  return _bucket;
}

// Lazy-initialized bucket export
export const bucket = new Proxy({} as Bucket, {
  get(_target, prop) {
    const actualBucket = getBucket();
    const value = actualBucket[prop as keyof typeof actualBucket];
    if (typeof value === 'function') {
      return value.bind(actualBucket);
    }
    return value;
  },
});

/**
 * Generate signed URL for direct browser upload
 * Expires in 15 minutes
 */
export async function generateUploadSignedUrl(filename: string, contentType: string): Promise<string> {
  const b = getBucket();
  const [url] = await b.file(filename).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: contentType,
  });
  return url;
}

/**
 * Generate signed URL for download
 * Expires in 1 hour
 */
export async function generateDownloadSignedUrl(filepath: string): Promise<string> {
  const b = getBucket();
  const [url] = await b.file(filepath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  return url;
}

/**
 * Upload buffer to GCS
 */
export async function uploadToGCS(
  filepath: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const b = getBucket();
  await b.file(filepath).save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
}

/**
 * Download file from GCS
 */
export async function downloadFromGCS(filepath: string): Promise<Buffer> {
  const b = getBucket();
  const [buffer] = await b.file(filepath).download();
  return buffer;
}

/**
 * Delete file from GCS
 */
export async function deleteFromGCS(filepath: string): Promise<void> {
  const b = getBucket();
  await b.file(filepath).delete();
}

/**
 * Check if file exists in GCS
 */
export async function fileExistsInGCS(filepath: string): Promise<boolean> {
  const b = getBucket();
  const [exists] = await b.file(filepath).exists();
  return exists;
}
