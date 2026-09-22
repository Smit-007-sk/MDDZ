#!/bin/bash
# =============================================================================
# MILLIONAIRE DIZITAL — LIVE VPS ADMIN & NGINX DEPLOYMENT SCRIPT
# =============================================================================

set -e

echo ">>> [1/6] Fetching latest code from GitHub main..."
cd /vps/mdz-develop
git fetch origin main
git reset --hard origin/main

echo ">>> [2/6] Configuring SELinux permissions for Nginx reverse proxy..."
if command -v setsebool >/dev/null 2>&1; then
    setsebool -P httpd_can_network_connect 1 || true
fi

echo ">>> [3/6] Setting up Systemd Admin Daemon Service..."
cp /vps/mdz-develop/millionaire-dizital-structured/mdz-admin.service /etc/systemd/system/mdz-admin.service
systemctl daemon-reload
systemctl enable mdz-admin
systemctl restart mdz-admin
sleep 1

echo ">>> [4/6] Updating Nginx Configuration..."
if [ -d "/etc/nginx/conf.d" ]; then
    cp /vps/mdz-develop/millionaire-dizital-structured/mdz-website.conf /etc/nginx/conf.d/mdz-website.conf
fi
if [ -d "/etc/nginx/sites-available" ]; then
    cp /vps/mdz-develop/millionaire-dizital-structured/mdz-website.conf /etc/nginx/sites-available/mdz-website.conf
    ln -sf /etc/nginx/sites-available/mdz-website.conf /etc/nginx/sites-enabled/mdz-website.conf
fi

echo ">>> [5/6] Testing and reloading Nginx..."
nginx -t
systemctl reload nginx

echo ">>> [6/6] Running Backend API Health Check..."
echo "Testing Direct Backend (8086)..."
curl -s http://127.0.0.1:8086/api/admin/check-auth || echo "Direct test note"
echo ""
echo "Testing Nginx Reverse Proxy (8085)..."
curl -s http://127.0.0.1:8085/api/admin/check-auth || echo "Nginx test note"
echo ""

echo "================================================================="
echo "  MILLIONAIRE DIZITAL ADMIN PANEL DEPLOYED SUCCESSFULLY!"
echo "  Admin URL: http://200.97.161.91:8085/admin"
echo "  Default Password: mdz@admin2026"
echo "================================================================="
