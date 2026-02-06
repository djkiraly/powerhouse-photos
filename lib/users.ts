// Helper functions to fetch user data from the auth database
// Since users are in a separate database, we need these utilities

import { authDb, users } from './db-auth';
import { eq, inArray } from 'drizzle-orm';

export type UserInfo = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'player';
};

/**
 * Fetch a single user by ID from the auth database
 */
export async function getUserById(userId: string): Promise<UserInfo | null> {
  const [user] = await authDb
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  return user || null;
}

/**
 * Fetch multiple users by IDs from the auth database
 * More efficient than multiple individual queries
 */
export async function getUsersByIds(userIds: string[]): Promise<UserInfo[]> {
  if (userIds.length === 0) return [];
  
  return authDb
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(inArray(users.id, userIds));
}

/**
 * Fetch all users from the auth database (for admin dropdowns, etc.)
 */
export async function getAllUsers(): Promise<UserInfo[]> {
  return authDb
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .orderBy(users.name);
}
