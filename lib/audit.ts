// Audit Trail Logging Utilities

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';

export type AuditAction =
  | 'PHOTO_UPLOAD'
  | 'PHOTO_DELETE'
  | 'PHOTO_BULK_DELETE'
  | 'PLAYER_TAG_CREATE'
  | 'PLAYER_TAG_BULK_CREATE'
  | 'PLAYER_TAG_DELETE'
  | 'TEAM_TAG_CREATE'
  | 'TEAM_TAG_BULK_CREATE'
  | 'TEAM_TAG_DELETE'
  | 'COLLECTION_PHOTO_ADD'
  | 'COLLECTION_PHOTO_REMOVE'
  | 'COLLECTION_SHARE_CREATE'
  | 'COLLECTION_SHARE_REVOKE'
  | 'USER_LOGIN'
  | 'USER_LOGIN_FAILED';

export type ResourceType =
  | 'Photo'
  | 'PhotoTag'
  | 'PhotoTeamTag'
  | 'Collection'
  | 'CollectionPhoto'
  | 'User';

interface AuditLogInput {
  action: AuditAction;
  userId: string;
  userName?: string | null;
  userRole?: string | null;
  resourceType: ResourceType;
  resourceId?: string | null;
  resourceIds?: string[];
  details?: Prisma.InputJsonValue | null;
}

/**
 * Extract client IP and user agent from request headers
 */
async function getRequestInfo(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || headersList.get('x-real-ip') || null;
    const userAgent = headersList.get('user-agent') || null;
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Log an audit event from an API route
 * Call this after successful operations
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    const { ipAddress, userAgent } = await getRequestInfo();

    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId,
        userName: input.userName,
        userRole: input.userRole,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceIds: input.resourceIds || [],
        details: input.details ?? Prisma.JsonNull,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log authentication events (login success/failure)
 * This is called from auth callbacks which may not have standard headers
 */
export async function logAuthAudit(input: {
  action: 'USER_LOGIN' | 'USER_LOGIN_FAILED';
  userId: string;
  userName?: string | null;
  userRole?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId,
        userName: input.userName,
        userRole: input.userRole,
        resourceType: 'User',
        resourceId: input.userId,
        resourceIds: [],
        details: input.email ? { email: input.email } : Prisma.JsonNull,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create auth audit log:', error);
  }
}
