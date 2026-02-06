# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start dev server on localhost:3000
npm run build            # Build for production
npm run lint             # Run ESLint

# Database (Prisma - Photo DB)
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations interactively
npm run db:studio        # Open Prisma Studio GUI
npm run db:push          # Push schema changes to DB

# Direct Prisma commands
npx prisma migrate dev --name <name>  # Create new migration
npx prisma migrate deploy             # Apply migrations (production)
```

## Architecture Overview

### Dual Database System

This app uses **two separate PostgreSQL databases** that cannot be joined:

1. **Auth DB (Drizzle ORM)** - `lib/db-auth.ts`
   - Shared with another app (Volleyball Fundraiser)
   - Read-only access for authentication
   - Contains: `users` table

2. **Photo DB (Prisma ORM)** - `lib/db.ts`
   - Photo-specific data with full CRUD
   - Contains: `Photo`, `Player`, `PhotoTag`, `Collection`, `CollectionPhoto`

**Critical Pattern**: User IDs are stored as UUID strings (not foreign keys). Always use helper functions in `lib/users.ts` for fetching user data across databases.

### Cross-Database Query Pattern

```typescript
// 1. Get photos from photo DB
const photos = await prisma.photo.findMany();

// 2. Extract unique user IDs
const userIds = [...new Set(photos.map(p => p.uploadedById))];

// 3. Fetch from auth DB with caching (5-min TTL)
const users = await getCachedUsers(userIds);

// 4. Combine data
const enriched = photos.map(p => ({
  ...p,
  uploader: users.get(p.uploadedById) || null
}));
```

### Image Upload Flow

1. Client requests signed URL: `POST /api/upload/signed-url`
2. Client uploads directly to GCS (browser-to-GCS, no server bandwidth)
3. Client calls `POST /api/photos` with metadata
4. Server generates thumbnail with Sharp and stores record

### Key Library Files

- `lib/auth.ts` - NextAuth v5 config with JWT strategy
- `lib/gcs.ts` - Google Cloud Storage utilities (signed URLs, thumbnails)
- `lib/users.ts` - Cross-database user fetch helpers
- `lib/user-cache.ts` - In-memory caching with TTL

## Code Patterns

### Protected API Route

```typescript
const session = await auth();
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Admin-Only Check

```typescript
if (session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Important Constraints

- **Never join across databases** - Use application-level joins via helper functions
- **User IDs are UUIDs** - Stored as strings, not foreign keys in photo DB
- **Auth DB is read-only** - User creation happens at `/api/auth/signup`, not via Drizzle
- **GCS signed URLs expire** - 15 min for uploads, 1 hour for downloads
- **Admin routes**: `/players` page and `/api/players/*` endpoints are admin-only

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS + shadcn/ui components
- NextAuth.js v5 (JWT sessions)
- Prisma (photo DB) + Drizzle (auth DB) on Neon PostgreSQL
- Google Cloud Storage + Sharp for image processing
