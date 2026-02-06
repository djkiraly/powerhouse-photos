# Quick Setup Guide

Follow these steps to get Powerhouse Photos running locally.

## 1. Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] npm installed
- [ ] Two Neon PostgreSQL databases created
- [ ] Google Cloud Storage bucket created
- [ ] GCS service account with credentials

## 2. Install Dependencies

```bash
npm install
```

## 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

### Required Environment Variables:

#### Photo Database (Prisma)
```
DATABASE_URL="postgresql://user:password@host:5432/photo_db?sslmode=require"
```

#### Auth Database (Drizzle - Shared)
```
AUTH_DATABASE_URL="postgresql://user:password@host:5432/auth_db?sslmode=require"
```

#### Google Cloud Storage
Get these from your GCS service account JSON file:
```
GCS_PROJECT_ID="your-project-id"
GCS_BUCKET_NAME="your-bucket-name"  
GCS_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important:** The private key should be the full key including header/footer with literal `\n` characters.

#### NextAuth
Generate a secret with `openssl rand -base64 32`:
```
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

#### App
```
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 4. Setup Auth Database (if not exists)

If the shared auth database doesn't exist yet, create it:

```sql
-- Connect to your AUTH database
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

CREATE INDEX idx_users_email ON users(email);
```

## 5. Setup Photo Database

Run Prisma migrations:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init
```

This will create all the necessary tables:
- `Player` - Player roster
- `Photo` - Photo metadata
- `PhotoTag` - Photo-player associations
- `Collection` - User collections
- `CollectionPhoto` - Collection-photo associations

## 6. Verify Database Connections

Test both database connections:

```bash
# Test Prisma connection
npx prisma studio

# This should open a browser window showing your photo database tables
```

For the auth database, you can use any PostgreSQL client to verify the connection.

## 7. Configure Google Cloud Storage

1. **Create a GCS Bucket:**
   - Go to Google Cloud Console
   - Create a new bucket (e.g., `powerhouse-photos`)
   - Set location and storage class
   - Make sure CORS is disabled or properly configured

2. **Create Service Account:**
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Grant roles:
     - Storage Object Creator
     - Storage Object Viewer
     - Storage Object Admin

3. **Generate Key:**
   - Click on the service account
   - Go to Keys tab
   - Add Key > Create new key
   - Choose JSON format
   - Download the JSON file

4. **Extract Credentials:**
   From the downloaded JSON file, copy:
   - `project_id` → `GCS_PROJECT_ID`
   - `private_key` → `GCS_PRIVATE_KEY` (keep the `\n` characters)
   - `client_email` → `GCS_CLIENT_EMAIL`

## 8. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 9. Create First User

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Create your account
3. Make yourself an admin:

```sql
-- Connect to your AUTH database
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

4. Log out and log back in to see admin features

## 10. Add Players

1. Log in as admin
2. Go to "Players" in the navigation
3. Add your first player
4. Now you can upload and tag photos!

## Troubleshooting

### "Can't reach database server"
- Check your database connection strings
- Ensure both databases are running
- Verify network connectivity
- Check if IP is whitelisted (for Neon)

### "Unauthorized" when accessing pages
- Clear browser cookies
- Check `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your domain
- Make sure you're logged in

### GCS Upload Fails
- Verify service account permissions
- Check bucket name is correct
- Ensure private key is properly formatted
- Look for CORS issues in browser console

### Prisma Errors
- Run `npx prisma generate` after schema changes
- Check `DATABASE_URL` is correct
- Try `npx prisma migrate reset` (development only)
- Verify database is accessible

### TypeScript Errors
- Run `npm install` to ensure all dependencies
- Restart TypeScript server in your editor
- Check for version conflicts

## Next Steps

Once everything is running:

1. **Upload Photos**: Go to Upload page and drag & drop photos
2. **Tag Photos**: Add player tags to your photos
3. **Create Collections**: Organize photos into albums
4. **Filter & Search**: Use filters to find specific photos
5. **Download**: Download individual photos or bulk download as ZIP

## Development Tips

- Use `npx prisma studio` to inspect/modify database
- Check `npm run build` before deploying
- Monitor GCS usage in Google Cloud Console
- Keep both databases backed up

## Production Deployment

Before deploying to production:

1. Set all environment variables in your hosting platform
2. Run `npx prisma migrate deploy`
3. Update `NEXTAUTH_URL` to your production domain
4. Configure proper CORS for GCS
5. Set up proper logging and monitoring
6. Enable SSL/HTTPS
7. Review security settings

## Support

See [README.md](./README.md) for full documentation.

For issues, check:
- Browser console for errors
- Server logs
- Database connection status
- GCS permissions
