// User data caching strategy for cross-database queries
// Since user data lives in a separate database, caching reduces query load

import { getUsersByIds, type UserInfo } from './users';

const userCache = new Map<string, { user: UserInfo, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Clean up expired cache entries to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [id, entry] of userCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      userCache.delete(id);
    }
  }
}

/**
 * Start the cache cleanup interval
 */
function startCacheCleanup(): void {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupExpiredEntries, CACHE_TTL);
  }
}

// Start cleanup on module load
startCacheCleanup();

/**
 * Get users with caching support
 * Checks cache first, fetches missing users from database
 */
export async function getCachedUsers(userIds: string[]): Promise<Map<string, UserInfo>> {
  const now = Date.now();
  const uncachedIds: string[] = [];
  const result = new Map<string, UserInfo>();

  // Check cache first
  for (const id of userIds) {
    const cached = userCache.get(id);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      result.set(id, cached.user);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached users
  if (uncachedIds.length > 0) {
    const freshUsers = await getUsersByIds(uncachedIds);
    for (const user of freshUsers) {
      userCache.set(user.id, { user, timestamp: now });
      result.set(user.id, user);
    }
  }

  return result;
}

/**
 * Clear cache for specific user (e.g., after user update)
 */
export function clearUserCache(userId: string): void {
  userCache.delete(userId);
}

/**
 * Clear entire user cache (e.g., on deployment)
 */
export function clearAllUserCache(): void {
  userCache.clear();
}

// Export for testing
export { cleanupExpiredEntries };
