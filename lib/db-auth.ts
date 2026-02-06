// Authentication Database Connection (Drizzle ORM)
// This database is shared with the Volleyball Fundraiser app
// READ-ONLY access for authentication purposes

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

let sql: NeonQueryFunction<boolean, boolean> | null = null;
let db: NeonHttpDatabase<Record<string, never>> | null = null;

function getAuthDb() {
  if (!db) {
    if (!process.env.AUTH_DATABASE_URL) {
      throw new Error('Missing required environment variable: AUTH_DATABASE_URL');
    }
    sql = neon(process.env.AUTH_DATABASE_URL);
    db = drizzle(sql);
  }
  return db;
}

// Lazy getter for authDb
export const authDb = new Proxy({} as NeonHttpDatabase<Record<string, never>>, {
  get(_target, prop) {
    const actualDb = getAuthDb();
    const value = actualDb[prop as keyof typeof actualDb];
    if (typeof value === 'function') {
      return value.bind(actualDb);
    }
    return value;
  },
});

export const userRoleEnum = pgEnum('user_role', ['admin', 'player']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('player'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
