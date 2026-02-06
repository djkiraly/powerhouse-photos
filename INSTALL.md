# PowerhousePhotos — Manual Installation Guide

A step-by-step walkthrough for manually installing PowerhousePhotos on a fresh
Ubuntu/Debian server. No scripts required — every command is listed explicitly.

> **Prefer automation?** See `deploy/production-deploy.sh` for an interactive
> script that handles all of this, or `deploy/setup.sh` for a non-interactive
> setup.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Preparation](#2-server-preparation)
3. [Install Node.js 22](#3-install-nodejs-22)
4. [Install PM2](#4-install-pm2)
5. [Install Nginx](#5-install-nginx)
6. [Install Certbot](#6-install-certbot)
7. [Deploy Application Code](#7-deploy-application-code)
8. [Configure Environment Variables](#8-configure-environment-variables)
9. [Set Up the Database](#9-set-up-the-database)
10. [Build the Application](#10-build-the-application)
11. [Start with PM2](#11-start-with-pm2)
12. [Configure Nginx — HTTP Only (Pre-SSL)](#12-configure-nginx--http-only-pre-ssl)
13. [Obtain SSL Certificate with Certbot](#13-obtain-ssl-certificate-with-certbot)
14. [Configure Nginx — Full SSL](#14-configure-nginx--full-ssl)
15. [Set Up Automatic Certificate Renewal](#15-set-up-automatic-certificate-renewal)
16. [Configure PM2 to Start on Boot](#16-configure-pm2-to-start-on-boot)
17. [Configure the Firewall](#17-configure-the-firewall)
18. [Create Your First User](#18-create-your-first-user)
19. [Verification Checklist](#19-verification-checklist)
20. [Updating the Application](#20-updating-the-application)
21. [Troubleshooting](#21-troubleshooting)

---

## 1. Prerequisites

Before you begin, make sure you have:

- [ ] A server running **Ubuntu 20.04+** or **Debian 11+**
- [ ] A **domain name** with DNS A record pointing to your server's IP address
- [ ] **Root or sudo access** to the server
- [ ] **Two PostgreSQL databases** (we use [Neon](https://neon.tech)):
  - Photo database (this app's data)
  - Auth database (shared authentication — may already exist)
- [ ] A **Google Cloud Storage** bucket with a service account key

Throughout this guide, replace these placeholders with your values:

| Placeholder | Example |
|-------------|---------|
| `YOUR_DOMAIN` | `photos.example.com` |
| `YOUR_EMAIL` | `admin@example.com` |

---

## 2. Server Preparation

SSH into your server and update all packages:

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

Install basic tools:

```bash
sudo apt-get install -y curl git
```

---

## 3. Install Node.js 22

Add the NodeSource repository and install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
```

Verify the installation:

```bash
node -v    # Should show v22.x.x
npm -v     # Should show 10.x.x or higher
```

---

## 4. Install PM2

PM2 is a process manager that keeps the app running and handles restarts:

```bash
sudo npm install -g pm2
```

Verify:

```bash
pm2 -v
```

---

## 5. Install Nginx

```bash
sudo apt-get install -y nginx
```

Start Nginx and enable it on boot:

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

Verify it's running:

```bash
sudo systemctl status nginx
```

You should see `active (running)`. If you open your server's IP in a browser,
you'll see the default Nginx welcome page.

---

## 6. Install Certbot

Certbot obtains free SSL certificates from Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

---

## 7. Deploy Application Code

Create the application directory and clone the repository:

```bash
sudo mkdir -p /var/www/powerhouse-photos
sudo mkdir -p /var/www/powerhouse-photos/logs
sudo mkdir -p /var/www/certbot
```

Clone the code (or copy it via `scp`/`rsync`):

```bash
cd /var/www
sudo git clone https://github.com/YOUR_REPO/powerhouse-photos.git powerhouse-photos
```

> **Alternative — copy files manually:**
> ```bash
> # From your local machine:
> rsync -avz --exclude node_modules --exclude .next --exclude .env \
>   ./ root@YOUR_SERVER_IP:/var/www/powerhouse-photos/
> ```

Navigate to the app directory:

```bash
cd /var/www/powerhouse-photos
```

---

## 8. Configure Environment Variables

Copy the example file and edit it:

```bash
cp .env.example .env
nano .env
```

Fill in every value. Here is a complete reference:

```env
# ── Databases ──────────────────────────────────────────────
# Photo database (Prisma ORM — this app's data)
DATABASE_URL="postgresql://user:password@host:5432/photo_db?sslmode=require"

# Auth database (Drizzle ORM — shared with other apps, read-only)
AUTH_DATABASE_URL="postgresql://user:password@host:5432/auth_db?sslmode=require"

# ── Google Cloud Storage ───────────────────────────────────
GCS_PROJECT_ID="your-gcp-project-id"
GCS_BUCKET_NAME="your-bucket-name"
GCS_CLIENT_EMAIL="svc@your-project.iam.gserviceaccount.com"
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_GCS_BUCKET_NAME="your-bucket-name"

# ── Authentication ─────────────────────────────────────────
NEXTAUTH_SECRET="paste-output-of-openssl-rand-base64-32"
NEXTAUTH_URL="https://YOUR_DOMAIN"

# ── Application ────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="https://YOUR_DOMAIN"
PORT=3000
```

### Generate the NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output and paste it as the `NEXTAUTH_SECRET` value.

### Notes on GCS_PRIVATE_KEY

The private key comes from your Google service account JSON file. It must
include the `-----BEGIN/END PRIVATE KEY-----` markers and use literal `\n`
characters for line breaks. Do **not** replace `\n` with actual newlines in
the `.env` file.

Save and exit nano (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 9. Set Up the Database

Install npm dependencies first (needed for Prisma):

```bash
npm ci --production=false
```

Generate the Prisma client:

```bash
npx prisma generate --config prisma/prisma.config.ts
```

Push the schema to your database (creates all tables):

```bash
npx prisma db push --config prisma/prisma.config.ts
```

> **Note:** If prompted about data loss due to unique constraints on nullable
> fields, add `--accept-data-loss` — this is safe on a fresh database.

Verify the connection worked:

```bash
npx prisma db pull --config prisma/prisma.config.ts
```

This should complete without errors. If it does, your database tables have been
created:
- `Player`, `Team`, `Folder`, `Photo`, `PhotoTag`, `PhotoTeamTag`
- `Collection`, `CollectionPhoto`
- `AuditLog`

### Auth Database (if it doesn't exist yet)

If the shared auth database has no `users` table, connect to it with `psql`
or any PostgreSQL client and run:

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

CREATE INDEX idx_users_email ON users(email);
```

---

## 10. Build the Application

```bash
npm run build
```

This compiles the Next.js app for production. It should finish with no errors
and print a route table.

---

## 11. Start with PM2

Start the application:

```bash
pm2 start ecosystem.config.js --env production
```

Check it's running:

```bash
pm2 status
```

You should see `powerhouse-photos` with status `online` and multiple instances
(one per CPU core).

Save the process list:

```bash
pm2 save
```

Test the app directly (before Nginx):

```bash
curl -s http://127.0.0.1:3000/api/health
```

Expected response: `{"status":"healthy","timestamp":"..."}`

---

## 12. Configure Nginx — HTTP Only (Pre-SSL)

Before Certbot can issue a certificate, Nginx must serve the ACME challenge
over HTTP. Create an initial config:

```bash
sudo nano /etc/nginx/sites-available/powerhouse-photos
```

Paste the following (replace `YOUR_DOMAIN` with your actual domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    # Certbot ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary response until SSL is configured
    location / {
        return 200 'PowerhousePhotos — SSL setup in progress';
        add_header Content-Type text/plain;
    }
}
```

Enable the site and remove the default:

```bash
sudo ln -sf /etc/nginx/sites-available/powerhouse-photos /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Verify by visiting `http://YOUR_DOMAIN` in a browser — you should see the
"SSL setup in progress" message.

---

## 13. Obtain SSL Certificate with Certbot

Run Certbot in webroot mode:

```bash
sudo certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d YOUR_DOMAIN \
  -d www.YOUR_DOMAIN \
  --non-interactive \
  --agree-tos \
  --email YOUR_EMAIL
```

On success, you'll see:

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem
```

Verify the certificate was created:

```bash
sudo certbot certificates
```

---

## 14. Configure Nginx — Full SSL

Now replace the temporary config with the full production config:

```bash
sudo nano /etc/nginx/sites-available/powerhouse-photos
```

Delete everything in the file and paste the following.

**Replace every occurrence of `YOUR_DOMAIN` with your actual domain** (there
are 7 occurrences). If your app uses a port other than 3000, also update the
`upstream` block.

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

# Upstream — must match PORT in .env and ecosystem.config.js
upstream powerhouse_photos {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP — redirect to HTTPS, allow ACME challenges
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    # SSL certificates (managed by Certbot)
    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/YOUR_DOMAIN/chain.pem;

    # TLS settings
    ssl_session_timeout  1d;
    ssl_session_cache    shared:SSL:10m;
    ssl_session_tickets  off;
    ssl_protocols        TLSv1.2 TLSv1.3;
    ssl_ciphers          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS — uncomment AFTER you have confirmed SSL is working
    # add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options            "SAMEORIGIN" always;
    add_header X-Content-Type-Options     "nosniff" always;
    add_header X-XSS-Protection           "1; mode=block" always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/powerhouse-photos.access.log;
    error_log  /var/log/nginx/powerhouse-photos.error.log;

    # Body size limit
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/rss+xml application/atom+xml image/svg+xml;

    # ── Location blocks (most specific first) ──

    # Upload endpoint — stricter rate limit
    location /api/upload/ {
        limit_req zone=upload_limit burst=5 nodelay;
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Health check — no rate limit
    location = /api/health {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes — standard rate limit
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Next.js hashed static assets — immutable cache
    location /_next/static/ {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon
    location /favicon.ico {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=86400";
    }

    # Everything else — Next.js pages, public share links, etc.
    location / {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Test the config and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Visit `https://YOUR_DOMAIN` — you should see the PowerhousePhotos login page
with a valid SSL certificate (padlock icon).

---

## 15. Set Up Automatic Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up a cron job to renew
them automatically:

```bash
echo '0 12 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx"' | sudo tee /etc/cron.d/certbot-renewal
sudo chmod 644 /etc/cron.d/certbot-renewal
```

This runs daily at noon. Certbot only renews when the certificate is within
30 days of expiry. After a successful renewal, `--deploy-hook` reloads Nginx
to pick up the new certificate.

Verify the cron file:

```bash
cat /etc/cron.d/certbot-renewal
```

Test the renewal process (dry run — no changes made):

```bash
sudo certbot renew --dry-run
```

---

## 16. Configure PM2 to Start on Boot

If the server reboots, PM2 should start your app automatically:

```bash
sudo pm2 startup systemd -u root --hp /root
pm2 save
```

Verify:

```bash
sudo systemctl is-enabled pm2-root
```

Should print `enabled`.

---

## 17. Configure the Firewall

If you're using `ufw` (Ubuntu's firewall), allow only the ports you need:

```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP (for ACME challenges and redirect)
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

Verify:

```bash
sudo ufw status
```

> **Important:** Do NOT expose port 3000 externally. Nginx proxies traffic to
> the app on `127.0.0.1:3000` — it should only be accessible locally.

---

## 18. Create Your First User

1. Open `https://YOUR_DOMAIN/signup` in your browser.
2. Create an account with your name, email, and password.
3. Promote yourself to admin by connecting to your **auth database** and running:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

4. Log out and log back in. You should now see the **Admin** link in the navigation bar.

---

## 19. Verification Checklist

Run through these checks to confirm everything is working:

```bash
# App is running
pm2 status

# App responds on port 3000 locally
curl -s http://127.0.0.1:3000/api/health

# Nginx is active
sudo systemctl status nginx

# Nginx config is valid
sudo nginx -t

# SSL certificate exists
sudo certbot certificates

# Auto-renewal cron is in place
cat /etc/cron.d/certbot-renewal

# HTTPS works from outside
curl -s -o /dev/null -w "%{http_code}" https://YOUR_DOMAIN/api/health
# Should print: 200

# HTTP redirects to HTTPS
curl -s -o /dev/null -w "%{http_code}" http://YOUR_DOMAIN
# Should print: 301

# PM2 will survive a reboot
sudo systemctl is-enabled pm2-root
# Should print: enabled
```

---

## 20. Updating the Application

When you need to deploy a new version:

```bash
cd /var/www/powerhouse-photos

# 1. Pull latest code
git pull origin main

# 2. Install dependencies (lockfile-based, clean install)
npm ci --production=false

# 3. Regenerate Prisma client (picks up schema changes)
npx prisma generate --config prisma/prisma.config.ts

# 4. If the schema changed, push it to the database
npx prisma db push --config prisma/prisma.config.ts

# 5. Build the production app
npm run build

# 6. Zero-downtime restart
pm2 reload ecosystem.config.js --env production
```

Or use the provided deploy script:

```bash
bash deploy/deploy.sh
```

---

## 21. Troubleshooting

### App won't start / PM2 shows `errored`

```bash
# Check application logs
pm2 logs powerhouse-photos --lines 50

# Check if .env is present and has no syntax errors
cat .env | grep -v PRIVATE_KEY

# Verify the port isn't taken by another process
sudo ss -tlnp | grep 3000
```

### 502 Bad Gateway from Nginx

Nginx can reach the server, but the app isn't responding:

```bash
# Is the app actually running?
pm2 status

# Is anything listening on port 3000?
sudo ss -tlnp | grep 3000

# Check Nginx error log for details
sudo tail -30 /var/log/nginx/powerhouse-photos.error.log

# Restart both
pm2 reload ecosystem.config.js --env production
sudo systemctl reload nginx
```

### SSL certificate not renewing

```bash
# Test the renewal process
sudo certbot renew --dry-run

# Check the cron job exists
cat /etc/cron.d/certbot-renewal

# Verify Nginx serves the ACME challenge directory
# (The HTTP server block must include the /.well-known/acme-challenge/ location)
curl -I http://YOUR_DOMAIN/.well-known/acme-challenge/test

# Manually force a renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Database connection errors

```bash
# Test that Prisma can reach the database
npx prisma db pull --config prisma/prisma.config.ts

# Check the connection string
grep DATABASE_URL .env

# Open Prisma Studio (interactive browser UI)
npx prisma studio --config prisma/prisma.config.ts
```

### Port conflict — changing from 3000

The port must match in three places:

| File | What to change |
|------|---------------|
| `.env` | `PORT=XXXX` |
| `ecosystem.config.js` | `env_production: { PORT: XXXX }` |
| `/etc/nginx/sites-available/powerhouse-photos` | `server 127.0.0.1:XXXX` in the `upstream` block |

After changing all three:

```bash
pm2 reload ecosystem.config.js --env production
sudo nginx -t && sudo systemctl reload nginx
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start app | `pm2 start ecosystem.config.js --env production` |
| Stop app | `pm2 stop powerhouse-photos` |
| Restart app (zero-downtime) | `pm2 reload ecosystem.config.js --env production` |
| View logs | `pm2 logs powerhouse-photos` |
| Monitor (live dashboard) | `pm2 monit` |
| Test Nginx config | `sudo nginx -t` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Check SSL status | `sudo certbot certificates` |
| Test SSL renewal | `sudo certbot renew --dry-run` |
| Force SSL renewal | `sudo certbot renew --force-renewal` |
| Push schema changes | `npx prisma db push --config prisma/prisma.config.ts` |
| Regenerate Prisma client | `npx prisma generate --config prisma/prisma.config.ts` |
| Build app | `npm run build` |
| Open DB browser | `npx prisma studio --config prisma/prisma.config.ts` |
