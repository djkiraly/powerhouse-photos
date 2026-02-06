# Powerhouse Photos

A Next.js photo sharing application for teams to upload, tag, organize, and share photos with Google Cloud Storage integration.

## Features

- **Photo Upload & Storage**: Bulk photo uploads with Google Cloud Storage integration
- **Player Tagging**: Tag photos with player names for easy organization
- **Collections**: Create custom albums to organize photos
- **Advanced Filtering**: Filter photos by players, dates, and uploaders
- **Bulk Downloads**: Download individual photos or create ZIP archives
- **Dual Database Architecture**: Separate authentication and photo databases
- **Role-Based Access**: Admin and player roles with different permissions

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Authentication**: NextAuth.js v5
- **Databases**: 
  - Neon PostgreSQL (Auth DB) - Drizzle ORM
  - Neon PostgreSQL (Photo DB) - Prisma ORM
- **Storage**: Google Cloud Storage
- **Image Processing**: Sharp (thumbnail generation)

## Prerequisites

- Node.js 20+ and npm
- Two Neon PostgreSQL databases (one for auth, one for photos)
- Google Cloud Storage bucket and service account credentials

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Photo Application Database (Prisma)
DATABASE_URL="postgresql://user:pass@host/photo_app_db"

# Authentication Database (Drizzle - shared with fundraiser app)
AUTH_DATABASE_URL="postgresql://user:pass@host/fundraiser_auth_db"

# Google Cloud Storage
GCS_PROJECT_ID="your-project-id"
GCS_BUCKET_NAME="your-bucket-name"
GCS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# NextAuth (must match fundraiser app for potential SSO)
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important Notes:**
- The `GCS_PRIVATE_KEY` should have literal `\n` characters in the string (they will be replaced at runtime)
- Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

### 3. Setup Databases

#### Authentication Database (Drizzle)

The authentication database is shared with the Volleyball Fundraiser app. If it doesn't exist yet, create it with:

```sql
CREATE TYPE user_role AS ENUM ('admin', 'player');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Photo Database (Prisma)

Initialize and migrate the Prisma database:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Optional: Open Prisma Studio to view data
npx prisma studio
```

### 4. Setup Google Cloud Storage

1. Create a GCS bucket in your Google Cloud project
2. Create a service account with the following permissions:
   - Storage Object Creator
   - Storage Object Viewer
   - Storage Object Admin (for deletions)
3. Download the service account JSON key
4. Extract the required values for your `.env.local`:
   - `client_email` → `GCS_CLIENT_EMAIL`
   - `private_key` → `GCS_PRIVATE_KEY`
   - `project_id` → `GCS_PROJECT_ID`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create First Admin User

1. Navigate to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Create your first account
3. Manually update the user role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Project Structure

```
├── app/
│   ├── (app)/              # Protected app routes
│   │   ├── layout.tsx      # App layout with navigation
│   │   ├── page.tsx        # Main gallery page
│   │   ├── upload/         # Upload page
│   │   ├── collections/    # Collections pages
│   │   ├── players/        # Player management (admin)
│   │   └── settings/       # Settings page
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth routes
│   │   ├── photos/         # Photo CRUD
│   │   ├── players/        # Player management
│   │   ├── tags/           # Photo tagging
│   │   ├── collections/    # Collection management
│   │   └── upload/         # Upload helpers
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── photos/             # Photo components
│   ├── collections/        # Collection components
│   └── players/            # Player components
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── db-auth.ts          # Drizzle auth DB client
│   ├── db.ts               # Prisma photo DB client
│   ├── users.ts            # User fetch helpers
│   ├── user-cache.ts       # User data caching
│   ├── gcs.ts              # Google Cloud Storage
│   └── utils.ts            # Utility functions
├── prisma/
│   └── schema.prisma       # Prisma schema
├── middleware.ts           # Auth middleware
└── README.md
```

## Database Architecture

This application uses two separate databases:

### Authentication Database (Drizzle)
- **Purpose**: Shared user authentication with Volleyball Fundraiser app
- **Access**: Read-only for authentication
- **Tables**: `users`

### Photo Database (Prisma)
- **Purpose**: Photo-specific data
- **Access**: Full read/write
- **Tables**: `photos`, `players`, `photo_tags`, `collections`, `collection_photos`

**Important**: User data cannot be joined via foreign keys. User IDs are stored as UUID strings and fetched separately using helper functions.

## Key Features Explained

### Photo Upload Flow

1. User selects files in browser
2. Client requests signed upload URL from API
3. Client uploads directly to GCS (no server bandwidth used)
4. After upload, client calls API to create photo record
5. Server generates thumbnail and stores metadata

### Player Tagging

- Admins manage the player roster
- Any user can tag photos with players
- Photos can have multiple player tags
- Filter photos by one or more players

### Collections

- Each user has private collections
- Add photos to multiple collections
- Photos remain in main library when collection is deleted
- Download entire collection as ZIP

### Cross-Database Queries

Since users are in a separate database, the app implements:
- Helper functions to batch fetch user data
- In-memory caching to reduce database queries
- Application-level joins between databases

## API Routes

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Photos
- `GET /api/photos` - List photos with filters
- `POST /api/photos` - Create photo record
- `GET /api/photos/[id]` - Get single photo
- `DELETE /api/photos/[id]` - Delete photo
- `POST /api/photos/bulk-download` - Download multiple photos as ZIP

### Players (Admin Only)
- `GET /api/players` - List all players
- `POST /api/players` - Create player
- `PATCH /api/players/[id]` - Update player
- `DELETE /api/players/[id]` - Delete player

### Tags
- `POST /api/tags` - Tag photo with player
- `PUT /api/tags` - Bulk tag multiple photos
- `DELETE /api/tags/[id]` - Remove tag

### Collections
- `GET /api/collections` - List user's collections
- `POST /api/collections` - Create collection
- `GET /api/collections/[id]` - Get collection details
- `PATCH /api/collections/[id]` - Update collection
- `DELETE /api/collections/[id]` - Delete collection
- `POST /api/collections/[id]/photos` - Add photo to collection
- `DELETE /api/collections/[id]/photos` - Remove photo from collection

### Upload
- `POST /api/upload/signed-url` - Generate GCS signed upload URL

## Security Considerations

- All routes protected with NextAuth middleware
- GCS signed URLs expire (15 min for upload, 1 hour for download)
- File type and size validation
- Admin-only routes for player management
- Users can only delete their own photos (except admins)
- Collections are private to each user

## Performance Optimizations

- Thumbnail generation for fast gallery loading
- User data caching for cross-database queries
- Direct browser-to-GCS uploads (no server bandwidth)
- Lazy loading of images
- Efficient database indexing
- Batch user queries instead of N+1

## Troubleshooting

### "Unauthorized" errors
- Check that `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your domain
- Clear browser cookies and re-login

### GCS upload fails
- Verify service account has correct permissions
- Check that `GCS_PRIVATE_KEY` has proper newline characters
- Ensure bucket name is correct

### Prisma errors
- Run `npx prisma generate` after schema changes
- Check `DATABASE_URL` connection string
- Verify database migrations are applied

### Cross-database issues
- User IDs must be valid UUIDs from auth database
- Use helper functions in `lib/users.ts` for fetching user data
- Check that both database connections are configured

## Development

### Adding a new feature
1. Create API route if needed
2. Update Prisma schema and migrate
3. Create/update React components
4. Test with development database

### Database migrations
```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Type generation
```bash
# Generate Prisma types
npx prisma generate

# Drizzle types are auto-inferred from schema
```

## Deployment

### Prerequisites
- Set all environment variables in your hosting platform
- Run database migrations
- Configure CORS for GCS bucket if needed

### Build
```bash
npm run build
npm start
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
