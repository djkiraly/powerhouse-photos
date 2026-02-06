#!/bin/bash
# SSL Certificate Renewal Script
# This script is called by certbot after successful renewal
# Place in /etc/letsencrypt/renewal-hooks/deploy/

# Reload nginx to pick up new certificates
systemctl reload nginx

# Log renewal
echo "$(date): SSL certificate renewed and nginx reloaded" >> /var/log/ssl-renewal.log
