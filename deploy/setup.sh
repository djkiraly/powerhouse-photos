#!/bin/bash
# Production Deployment Setup Script for PowerhousePhotos
# Run this script on a fresh Ubuntu/Debian server
# Usage: sudo bash setup.sh YOUR_DOMAIN.com YOUR_EMAIL@example.com

set -e

# Check arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: sudo bash setup.sh YOUR_DOMAIN.com YOUR_EMAIL@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
APP_DIR="/var/www/powerhouse-photos"
NODE_VERSION="22"

echo "=========================================="
echo "PowerhousePhotos Production Setup"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "=========================================="

# Update system
echo "[1/8] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "[2/8] Installing dependencies..."
apt-get install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js
echo "[3/8] Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "[4/8] Installing PM2..."
npm install -g pm2

# Create application directory
echo "[5/8] Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p /var/www/certbot

# Configure Nginx (initial HTTP-only for certbot)
echo "[6/8] Configuring Nginx for initial setup..."
cat > /etc/nginx/sites-available/powerhouse-photos << 'NGINX_INITIAL'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'PowerhousePhotos - SSL setup in progress';
        add_header Content-Type text/plain;
    }
}
NGINX_INITIAL

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN www.$DOMAIN/g" /etc/nginx/sites-available/powerhouse-photos

# Enable site and restart nginx
ln -sf /etc/nginx/sites-available/powerhouse-photos /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Obtain SSL certificate
echo "[7/8] Obtaining SSL certificate..."
certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

# Deploy full Nginx config with SSL
echo "[8/8] Deploying full Nginx configuration..."
cat > /etc/nginx/sites-available/powerhouse-photos << 'NGINX_FULL'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

upstream powerhouse_photos {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_CERT/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_CERT/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/DOMAIN_CERT/chain.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (uncomment after confirming SSL works)
    # add_header Strict-Transport-Security "max-age=63072000" always;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    access_log /var/log/nginx/powerhouse-photos.access.log;
    error_log /var/log/nginx/powerhouse-photos.error.log;

    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

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

    location = /api/health {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

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

    location /_next/static/ {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

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
NGINX_FULL

# Replace domain placeholders
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN www.$DOMAIN/g" /etc/nginx/sites-available/powerhouse-photos
sed -i "s/DOMAIN_CERT/$DOMAIN/g" /etc/nginx/sites-available/powerhouse-photos

# Test and reload nginx
nginx -t
systemctl reload nginx

# Setup certbot auto-renewal
echo "0 12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renewal
chmod 644 /etc/cron.d/certbot-renewal

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy your application to: $APP_DIR"
echo "2. Create .env file: cp .env.example .env && nano .env"
echo "3. Install deps: cd $APP_DIR && npm install"
echo "4. Generate Prisma: npx prisma generate --config prisma/prisma.config.ts"
echo "5. Push schema:     npx prisma db push --config prisma/prisma.config.ts"
echo "6. Build app:       npm run build"
echo "7. Start with PM2:  pm2 start ecosystem.config.js --env production"
echo "8. Save PM2 config: pm2 save"
echo ""
echo "Useful commands:"
echo "  pm2 status           - Check app status"
echo "  pm2 logs             - View logs"
echo "  pm2 restart all      - Restart app"
echo "  pm2 monit            - Monitor in real-time"
echo ""
