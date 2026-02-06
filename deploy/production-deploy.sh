#!/bin/bash
# ============================================================================
# PowerhousePhotos — Manual Production Deployment Script
# ============================================================================
#
# A single interactive script that handles fresh installs, app updates,
# Nginx configuration, and SSL certificate provisioning with Certbot.
#
# Usage:
#   sudo bash deploy/production-deploy.sh
#
# The script presents a menu so you can run individual steps or the full
# pipeline. It is safe to re-run — each step checks current state before
# making changes.
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — edit these if your paths differ
# ---------------------------------------------------------------------------
APP_DIR="/var/www/powerhouse-photos"
NGINX_SITE="powerhouse-photos"
NGINX_AVAILABLE="/etc/nginx/sites-available/$NGINX_SITE"
NGINX_ENABLED="/etc/nginx/sites-enabled/$NGINX_SITE"
CERTBOT_WEBROOT="/var/www/certbot"
CRON_FILE="/etc/cron.d/certbot-renewal"
NODE_VERSION="22"
APP_PORT="3000"
GIT_BRANCH="main"

# ---------------------------------------------------------------------------
# Colors and helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

confirm() {
    read -r -p "$(echo -e "${YELLOW}$1 [y/N]:${NC} ")" response
    [[ "$response" =~ ^[Yy]$ ]]
}

require_root() {
    if [[ $EUID -ne 0 ]]; then
        fail "This script must be run as root (use sudo)."
    fi
}

separator() {
    echo ""
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}  $1${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo ""
}

# ---------------------------------------------------------------------------
# Prompt for domain and email (cached for the session)
# ---------------------------------------------------------------------------
DOMAIN=""
EMAIL=""

prompt_domain() {
    if [[ -z "$DOMAIN" ]]; then
        read -r -p "Enter your domain (e.g. photos.example.com): " DOMAIN
        [[ -z "$DOMAIN" ]] && fail "Domain is required."
    fi
}

prompt_email() {
    if [[ -z "$EMAIL" ]]; then
        read -r -p "Enter email for Let's Encrypt notifications: " EMAIL
        [[ -z "$EMAIL" ]] && fail "Email is required."
    fi
}

# ============================================================================
# Step 1: Install system prerequisites
# ============================================================================
step_prerequisites() {
    separator "Step 1: System Prerequisites"
    require_root

    info "Updating package lists..."
    apt-get update -qq

    local PACKAGES="curl git nginx certbot python3-certbot-nginx"
    info "Installing: $PACKAGES"
    apt-get install -y -qq $PACKAGES

    # Node.js
    if command -v node &>/dev/null; then
        local CURRENT_NODE
        CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
        if [[ "$CURRENT_NODE" -ge "$NODE_VERSION" ]]; then
            success "Node.js $(node -v) already installed."
        else
            warn "Node.js $CURRENT_NODE found, upgrading to $NODE_VERSION..."
            curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
            apt-get install -y -qq nodejs
        fi
    else
        info "Installing Node.js $NODE_VERSION..."
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
        apt-get install -y -qq nodejs
    fi

    # PM2
    if command -v pm2 &>/dev/null; then
        success "PM2 already installed ($(pm2 -v))."
    else
        info "Installing PM2 globally..."
        npm install -g pm2
    fi

    # Directories
    mkdir -p "$APP_DIR" "$APP_DIR/logs" "$CERTBOT_WEBROOT"

    success "All prerequisites installed."
}

# ============================================================================
# Step 2: Deploy / update application code
# ============================================================================
step_deploy_app() {
    separator "Step 2: Deploy Application"

    if [[ ! -d "$APP_DIR/package.json" ]] && [[ ! -f "$APP_DIR/package.json" ]]; then
        warn "No application found at $APP_DIR."
        echo ""
        echo "  Option A — Clone via git:"
        echo "    git clone <your-repo-url> $APP_DIR"
        echo ""
        echo "  Option B — Copy files manually (scp/rsync)."
        echo ""
        if ! confirm "Has the application code been placed in $APP_DIR?"; then
            fail "Please deploy application code to $APP_DIR first, then re-run."
        fi
    fi

    cd "$APP_DIR"

    # Git pull if it's a git repo
    if [[ -d ".git" ]]; then
        info "Pulling latest changes from $GIT_BRANCH..."
        git pull origin "$GIT_BRANCH"
        success "Git pull complete."
    else
        info "Not a git repository — skipping pull."
    fi

    # Environment file
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            warn "No .env file found. Creating from .env.example..."
            cp .env.example .env
            echo ""
            echo -e "${YELLOW}  IMPORTANT: Edit .env with your production values before continuing.${NC}"
            echo "  Required: DATABASE_URL, AUTH_DATABASE_URL, GCS_*, NEXTAUTH_SECRET,"
            echo "            NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_GCS_BUCKET_NAME"
            echo ""
            echo "  Generate NEXTAUTH_SECRET with:  openssl rand -base64 32"
            echo ""
            if confirm "Open .env in nano now?"; then
                nano .env
            else
                warn "Remember to edit .env before starting the application."
            fi
        else
            fail "No .env or .env.example found. Cannot continue."
        fi
    else
        success ".env file exists."
    fi

    # Install dependencies
    info "Installing npm dependencies..."
    npm ci --production=false
    success "Dependencies installed."

    # Generate Prisma client
    info "Generating Prisma client..."
    npx prisma generate --config prisma/prisma.config.ts
    success "Prisma client generated."

    # Push schema (only if user confirms — this touches the database)
    if confirm "Push database schema? (only needed on first deploy or schema changes)"; then
        info "Pushing schema to database..."
        npx prisma db push --config prisma/prisma.config.ts
        success "Database schema synced."
    fi

    # Build
    info "Building production application..."
    npm run build
    success "Build complete."

    # Start or reload PM2
    if pm2 describe powerhouse-photos &>/dev/null; then
        info "Reloading PM2 (zero-downtime)..."
        pm2 reload ecosystem.config.js --env production
    else
        info "Starting application with PM2..."
        pm2 start ecosystem.config.js --env production
    fi

    # Save PM2 process list so it survives reboots
    pm2 save

    # Setup PM2 startup if not already done
    if ! systemctl is-enabled pm2-root &>/dev/null 2>&1; then
        info "Configuring PM2 to start on boot..."
        pm2 startup systemd -u root --hp /root
        pm2 save
    fi

    success "Application deployed and running."
    echo ""
    pm2 status
}

# ============================================================================
# Step 3: Configure Nginx
# ============================================================================
step_nginx() {
    separator "Step 3: Nginx Configuration"
    require_root
    prompt_domain

    # Determine if SSL certs already exist
    local HAS_SSL=false
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        HAS_SSL=true
        success "SSL certificate found for $DOMAIN."
    else
        warn "No SSL certificate found for $DOMAIN — will configure HTTP-only first."
    fi

    # Back up existing config
    if [[ -f "$NGINX_AVAILABLE" ]]; then
        local BACKUP="${NGINX_AVAILABLE}.backup.$(date +%Y%m%d%H%M%S)"
        cp "$NGINX_AVAILABLE" "$BACKUP"
        info "Backed up existing config to $BACKUP"
    fi

    if [[ "$HAS_SSL" == true ]]; then
        write_nginx_full
    else
        write_nginx_http_only
    fi

    # Enable site
    ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    rm -f /etc/nginx/sites-enabled/default

    # Test and reload
    info "Testing Nginx configuration..."
    if nginx -t 2>&1; then
        systemctl reload nginx
        success "Nginx configured and reloaded."
    else
        fail "Nginx configuration test failed. Check the config at $NGINX_AVAILABLE"
    fi
}

write_nginx_http_only() {
    info "Writing HTTP-only Nginx config (for Certbot challenge)..."
    cat > "$NGINX_AVAILABLE" <<NGINXEOF
# PowerhousePhotos — HTTP-only (pre-SSL)
# This config exists so Certbot can complete the ACME challenge.
# After obtaining the certificate, re-run the Nginx step to get the full config.

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
    }

    location / {
        return 200 'PowerhousePhotos — SSL setup in progress';
        add_header Content-Type text/plain;
    }
}
NGINXEOF
}

write_nginx_full() {
    info "Writing full Nginx config with SSL and reverse proxy..."
    cat > "$NGINX_AVAILABLE" <<NGINXEOF
# PowerhousePhotos — Production Nginx Configuration
# Generated by production-deploy.sh on $(date -Iseconds)

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=upload_limit:10m rate=2r/s;

# Upstream — must match PORT in .env and ecosystem.config.js
upstream powerhouse_photos {
    server 127.0.0.1:${APP_PORT};
    keepalive 64;
}

# HTTP — redirect to HTTPS, allow ACME challenges
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL certificates (managed by Certbot)
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;

    # TLS settings
    ssl_session_timeout  1d;
    ssl_session_cache    shared:SSL:10m;
    ssl_session_tickets  off;
    ssl_protocols        TLSv1.2 TLSv1.3;
    ssl_ciphers          ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS — uncomment once you have confirmed SSL is working
    # add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options            "SAMEORIGIN" always;
    add_header X-Content-Type-Options     "nosniff" always;
    add_header X-XSS-Protection           "1; mode=block" always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/powerhouse-photos.access.log;
    error_log  /var/log/nginx/powerhouse-photos.error.log;

    # Body size limit (thumbnail generation passes through here)
    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # --- Location blocks (order matters: most specific first) ---

    # Upload endpoint — stricter rate limit
    location /api/upload/ {
        limit_req zone=upload_limit burst=5 nodelay;
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Health check — no rate limit
    location = /api/health {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API routes — standard rate limit
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Next.js hashed static assets — immutable cache
    location /_next/static/ {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Favicon
    location /favicon.ico {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        add_header Cache-Control "public, max-age=86400";
    }

    # Everything else — Next.js pages, public share links, etc.
    location / {
        proxy_pass http://powerhouse_photos;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF
}

# ============================================================================
# Step 4: SSL certificate with Certbot
# ============================================================================
step_certbot() {
    separator "Step 4: SSL Certificate (Certbot)"
    require_root
    prompt_domain
    prompt_email

    # Check if certificate already exists
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        success "Certificate already exists for $DOMAIN."
        echo ""
        certbot certificates -d "$DOMAIN" 2>/dev/null || true
        echo ""

        if confirm "Force renew the existing certificate?"; then
            info "Renewing certificate..."
            certbot renew --cert-name "$DOMAIN" --force-renewal
            systemctl reload nginx
            success "Certificate renewed and Nginx reloaded."
        else
            info "Skipping renewal."
        fi
    else
        # Ensure HTTP Nginx config is in place for the challenge
        if ! grep -q "acme-challenge" "$NGINX_AVAILABLE" 2>/dev/null; then
            warn "Nginx not configured for ACME challenges. Setting up HTTP config first..."
            write_nginx_http_only
            ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
            rm -f /etc/nginx/sites-enabled/default
            nginx -t && systemctl reload nginx
        fi

        info "Obtaining SSL certificate for $DOMAIN and www.$DOMAIN..."
        certbot certonly \
            --webroot \
            -w "$CERTBOT_WEBROOT" \
            -d "$DOMAIN" \
            -d "www.$DOMAIN" \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL"

        success "SSL certificate obtained."

        # Now deploy the full Nginx config with SSL
        info "Switching Nginx to full SSL configuration..."
        write_nginx_full
        if nginx -t 2>&1; then
            systemctl reload nginx
            success "Nginx reloaded with SSL."
        else
            fail "Nginx config test failed after SSL setup."
        fi
    fi

    # Certbot auto-renewal cron
    if [[ ! -f "$CRON_FILE" ]]; then
        info "Setting up automatic certificate renewal..."
        echo "0 12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" > "$CRON_FILE"
        chmod 644 "$CRON_FILE"
        success "Auto-renewal cron installed at $CRON_FILE"
    else
        success "Auto-renewal cron already exists."
    fi

    # Verify
    echo ""
    info "Testing renewal process (dry run)..."
    certbot renew --dry-run 2>&1 | tail -3
    echo ""
}

# ============================================================================
# Step 5: Validate the deployment
# ============================================================================
step_validate() {
    separator "Step 5: Validation"

    local ERRORS=0

    # Check PM2
    echo -n "  PM2 process running........... "
    if pm2 describe powerhouse-photos &>/dev/null; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${RED}NO${NC}"
        ((ERRORS++))
    fi

    # Check port
    echo -n "  App listening on port $APP_PORT... "
    if ss -tlnp 2>/dev/null | grep -q ":${APP_PORT}"; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${RED}NO${NC}"
        ((ERRORS++))
    fi

    # Check Nginx
    echo -n "  Nginx running................. "
    if systemctl is-active nginx &>/dev/null; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${RED}NO${NC}"
        ((ERRORS++))
    fi

    # Check Nginx config valid
    echo -n "  Nginx config valid............ "
    if nginx -t 2>/dev/null; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${RED}NO${NC}"
        ((ERRORS++))
    fi

    # Check SSL cert
    if [[ -n "$DOMAIN" ]]; then
        echo -n "  SSL certificate for $DOMAIN.. "
        if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
            local EXPIRY
            EXPIRY=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null | cut -d= -f2)
            echo -e "${GREEN}YES${NC} (expires: $EXPIRY)"
        else
            echo -e "${YELLOW}NOT FOUND${NC}"
        fi
    fi

    # Check auto-renewal cron
    echo -n "  Certbot auto-renewal cron..... "
    if [[ -f "$CRON_FILE" ]]; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${YELLOW}NOT FOUND${NC}"
    fi

    # Health check
    echo -n "  Health endpoint (localhost).... "
    local HEALTH
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || echo "000")
    if [[ "$HEALTH" == "200" ]]; then
        echo -e "${GREEN}200 OK${NC}"
    else
        echo -e "${RED}HTTP $HEALTH${NC}"
        ((ERRORS++))
    fi

    # .env file
    echo -n "  .env file present............. "
    if [[ -f "$APP_DIR/.env" ]]; then
        echo -e "${GREEN}YES${NC}"
    else
        echo -e "${RED}NO${NC}"
        ((ERRORS++))
    fi

    echo ""
    if [[ $ERRORS -eq 0 ]]; then
        success "All checks passed."
    else
        warn "$ERRORS check(s) failed. Review the output above."
    fi
}

# ============================================================================
# Full pipeline — run all steps in order
# ============================================================================
run_full() {
    prompt_domain
    prompt_email
    step_prerequisites
    step_deploy_app
    step_nginx
    step_certbot
    step_validate
    separator "Deployment Complete"
    echo "  Your app should be live at: https://$DOMAIN"
    echo ""
    echo "  Useful commands:"
    echo "    pm2 status                    — check app status"
    echo "    pm2 logs powerhouse-photos    — view app logs"
    echo "    pm2 monit                     — real-time dashboard"
    echo "    sudo nginx -t                 — test nginx config"
    echo "    sudo certbot certificates     — view SSL status"
    echo ""
}

# ============================================================================
# Interactive menu
# ============================================================================
show_menu() {
    echo ""
    echo -e "${BOLD}PowerhousePhotos — Production Deployment${NC}"
    echo ""
    echo "  1)  Full deployment (all steps below, in order)"
    echo "  ──────────────────────────────────────────────"
    echo "  2)  Install system prerequisites (Node, Nginx, PM2, Certbot)"
    echo "  3)  Deploy / update application (git pull, build, PM2 restart)"
    echo "  4)  Configure Nginx (write config, enable site, reload)"
    echo "  5)  SSL certificate (obtain or renew via Certbot)"
    echo "  6)  Validate deployment (health checks)"
    echo "  ──────────────────────────────────────────────"
    echo "  0)  Exit"
    echo ""
}

main() {
    if [[ $EUID -ne 0 ]]; then
        fail "This script must be run as root (use sudo)."
    fi

    # Allow a direct command: sudo bash production-deploy.sh full
    if [[ "${1:-}" == "full" ]]; then
        run_full
        exit 0
    fi

    while true; do
        show_menu
        read -r -p "Select an option: " choice
        case $choice in
            1) run_full ;;
            2) step_prerequisites ;;
            3) step_deploy_app ;;
            4) step_nginx ;;
            5) step_certbot ;;
            6) step_validate ;;
            0) echo "Bye."; exit 0 ;;
            *) warn "Invalid choice." ;;
        esac
    done
}

main "$@"
