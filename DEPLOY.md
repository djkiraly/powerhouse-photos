# PowerhousePhotos Production Deployment Guide

## Overview

This guide covers deploying PowerhousePhotos to a production server with:
- **Nginx** - Reverse proxy with SSL termination
- **Certbot** - Free SSL certificates from Let's Encrypt
- **PM2** - Process manager for Node.js

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ server
- Domain name pointing to your server's IP
- Root or sudo access

## Quick Start

### Option A: Interactive Deployment Script (Recommended)

The `production-deploy.sh` script provides an interactive menu covering all deployment
steps — prerequisites, app deployment, Nginx configuration, SSL certificates, and
validation. It can be run for fresh installs or ongoing updates.

```bash
# Clone repository
git clone https://github.com/YOUR_REPO/powerhouse-photos.git /var/www/powerhouse-photos
cd /var/www/powerhouse-photos

# Full deployment (interactive menu)
sudo bash deploy/production-deploy.sh

# Or run all steps non-interactively
sudo bash deploy/production-deploy.sh full
```

Individual steps can also be selected from the menu (e.g. "just update the app" or
"just renew the SSL certificate").

### Option B: Setup + Deploy Scripts (Separate)

```bash
# Clone repository
git clone https://github.com/YOUR_REPO/powerhouse-photos.git /var/www/powerhouse-photos
cd /var/www/powerhouse-photos

# First-time server setup (installs Node.js 22, Nginx, Certbot, PM2, obtains SSL cert)
sudo bash deploy/setup.sh yourdomain.com your@email.com
```

### 2. Configure Environment

```bash
cd /var/www/powerhouse-photos
cp .env.example .env
nano .env
```

Required values:
```env
# Databases
DATABASE_URL="postgresql://user:pass@host/photo_app_db"
AUTH_DATABASE_URL="postgresql://user:pass@host/fundraiser_auth_db"

# Google Cloud Storage
GCS_PROJECT_ID="your-project"
GCS_BUCKET_NAME="your-bucket"
GCS_CLIENT_EMAIL="...@....iam.gserviceaccount.com"
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_GCS_BUCKET_NAME="your-bucket"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
PORT=3000
```

Generate a secret: `openssl rand -base64 32`

### 3. Build and Start

```bash
npm install
npx prisma generate --config prisma/prisma.config.ts
npx prisma db push --config prisma/prisma.config.ts
npm run build
npm run pm2:start
pm2 save
```

## Configuration Files

### PM2 (ecosystem.config.js)

The PM2 configuration runs the app in cluster mode for optimal performance:

```javascript
{
  name: 'powerhouse-photos',
  script: 'node_modules/next/dist/bin/next',
  args: 'start -H 0.0.0.0',
  instances: 'max',        // Use all CPU cores
  exec_mode: 'cluster',    // Load balancing
  env_production: {
    NODE_ENV: 'production',
    PORT: 3000,
  },
  max_memory_restart: '1G' // Auto-restart on memory leak
}
```

### Nginx (deploy/nginx.conf)

Key features:
- HTTP to HTTPS redirect
- Rate limiting for API endpoints (10 req/s general, 2 req/s uploads)
- Gzip compression
- Security headers (X-Frame-Options, X-Content-Type-Options, XSS-Protection)
- WebSocket upgrade support
- Immutable caching for `/_next/static/`
- Health check endpoint bypass (no rate limiting)

The upstream connects to `127.0.0.1:3000` — this must match the `PORT` in `.env` and `ecosystem.config.js`.

### SSL Certificates

Managed by Certbot with automatic renewal via cron:
```
0 12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'
```

This runs daily at noon. On successful renewal, Nginx reloads to pick up new certs.

## Port Configuration

The application port must be consistent across three places:

| File | Setting | Default |
|------|---------|---------|
| `.env` | `PORT=3000` | 3000 |
| `ecosystem.config.js` | `env_production: { PORT: 3000 }` | 3000 |
| `deploy/nginx.conf` | `server 127.0.0.1:3000` (upstream block) | 3000 |

To change the port (e.g., to 4000):

1. Update `.env`:
   ```env
   PORT=4000
   ```

2. Update `ecosystem.config.js`:
   ```javascript
   env_production: {
     PORT: 4000,
   }
   ```

3. Update nginx upstream in `/etc/nginx/sites-available/powerhouse-photos`:
   ```nginx
   upstream powerhouse_photos {
       server 127.0.0.1:4000;
   }
   ```

4. Restart both services:
   ```bash
   npm run pm2:restart
   sudo systemctl reload nginx
   ```

## Common Operations

### Application Management

```bash
# Start application
npm run pm2:start

# Restart (zero-downtime reload)
npm run pm2:restart

# Stop application
npm run pm2:stop

# View logs (live tail)
npm run pm2:logs

# Monitor real-time (CPU, memory, restarts)
pm2 monit

# Check status
npm run pm2:status
```

### Deployment Updates

```bash
cd /var/www/powerhouse-photos
bash deploy/deploy.sh
```

Or manually:
```bash
git pull origin main
npm ci
npx prisma generate --config prisma/prisma.config.ts
npm run build
npm run pm2:restart
```

### Database Schema Updates

This project uses `db push` (not migrations) to sync the schema:

```bash
cd /var/www/powerhouse-photos
npx prisma db push --config prisma/prisma.config.ts
npx prisma generate --config prisma/prisma.config.ts
npm run build
npm run pm2:restart
```

### SSL Certificate Management

```bash
# Check certificate status and expiry dates
sudo certbot certificates

# Test renewal (dry run, no changes)
sudo certbot renew --dry-run

# Force renewal (if needed before expiry)
sudo certbot renew --force-renewal

# After any manual renewal, reload nginx
sudo systemctl reload nginx
```

Auto-renewal is configured at `/etc/cron.d/certbot-renewal`. To verify:
```bash
cat /etc/cron.d/certbot-renewal
```

### Nginx Management

```bash
# Test configuration syntax
sudo nginx -t

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Restart nginx (brief downtime)
sudo systemctl restart nginx

# View access logs
tail -f /var/log/nginx/powerhouse-photos.access.log

# View error logs
tail -f /var/log/nginx/powerhouse-photos.error.log
```

## Health Monitoring

The `/api/health` endpoint returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Use with monitoring services (UptimeRobot, Pingdom, etc.):
```
https://yourdomain.com/api/health
```

This endpoint bypasses rate limiting in the Nginx config.

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs for errors
pm2 logs powerhouse-photos --lines 100

# Check if port is already in use
sudo lsof -i :3000

# Verify environment variables are loaded
pm2 env 0

# Check .env file exists and has correct values
cat .env | grep -v PRIVATE_KEY
```

### 502 Bad Gateway

This means Nginx can't reach the app on port 3000.

```bash
# Is the app running?
pm2 status

# Is it listening on the right port?
sudo ss -tlnp | grep 3000

# Check nginx error log for upstream connection errors
sudo tail -20 /var/log/nginx/powerhouse-photos.error.log

# Restart everything
npm run pm2:restart
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate details
sudo certbot certificates

# Test renewal process
sudo certbot renew --dry-run

# If renewal fails, check webroot is accessible
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Verify Nginx serves the challenge directory
# The HTTP server block must have:
#   location /.well-known/acme-challenge/ { root /var/www/certbot; }

# Re-obtain certificate if needed
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com

# After fixing, test nginx config and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Database Connection Issues

```bash
# Test Prisma can connect
npx prisma db pull --config prisma/prisma.config.ts

# Verify DATABASE_URL is set
grep DATABASE_URL .env

# Open Prisma Studio to inspect data
npx prisma studio --config prisma/prisma.config.ts
```

## Security Checklist

- [ ] Strong NEXTAUTH_SECRET (32+ random bytes): `openssl rand -base64 32`
- [ ] Database credentials not exposed (`.env` not in git)
- [ ] GCS service account has minimal permissions (Storage Object Admin only)
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSH key authentication enabled, password auth disabled
- [ ] Regular `apt update && apt upgrade`
- [ ] HSTS header enabled in Nginx (uncomment after SSL confirmed working)
- [ ] Log rotation configured for Nginx and PM2 logs

## Performance Tuning

### PM2 Cluster Mode

Adjust instances based on server resources:
```javascript
// Use specific number instead of 'max'
instances: 4,
```

### Nginx Worker Processes

Edit `/etc/nginx/nginx.conf`:
```nginx
worker_processes auto;  # One per CPU core
worker_connections 1024;
```

### Node.js Memory

Adjust in `ecosystem.config.js` for larger servers:
```javascript
max_memory_restart: '2G',
node_args: '--max-old-space-size=2048',
```
