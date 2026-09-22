#!/bin/bash
# =============================================================================
# MILLIONAIRE DIZITAL — LIVE VPS ADMIN & NGINX DEPLOYMENT SCRIPT
# =============================================================================

set -e

echo ">>> [1/5] Fetching latest code from GitHub main..."
cd /vps/mdz-develop
git fetch origin main
git reset --hard origin/main

echo ">>> [2/5] Setting up Systemd Admin Daemon Service..."
cp /vps/mdz-develop/millionaire-dizital-structured/mdz-admin.service /etc/systemd/system/mdz-admin.service
systemctl daemon-reload
systemctl enable mdz-admin
systemctl restart mdz-admin

echo ">>> [3/5] Updating Nginx Configuration..."
if [ -d "/etc/nginx/sites-available" ]; then
    cp /vps/mdz-develop/millionaire-dizital-structured/mdz-website.conf /etc/nginx/sites-available/mdz-website.conf
    ln -sf /etc/nginx/sites-available/mdz-website.conf /etc/nginx/sites-enabled/mdz-website.conf
elif [ -d "/etc/nginx/conf.d" ]; then
    cp /vps/mdz-develop/millionaire-dizital-structured/mdz-website.conf /etc/nginx/conf.d/mdz-website.conf
fi

echo ">>> [4/5] Testing and reloading Nginx..."
nginx -t
systemctl reload nginx

echo ">>> [5/5] Verifying Admin Daemon Status..."
systemctl status mdz-admin --no-pager

echo "================================================================="
echo "  MILLIONAIRE DIZITAL ADMIN PANEL DEPLOYED SUCCESSFULLY!"
echo "  Admin URL: http://200.97.161.91:8085/admin"
echo "  Default Password: mdz@admin2026"
echo "================================================================="
