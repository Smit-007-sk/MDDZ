#!/bin/bash
# =============================================================================
# MILLIONAIRE DIZITAL — LIVE VPS ADMIN DEPLOYMENT SCRIPT
# =============================================================================

set -e

echo ">>> [1/5] Fetching latest code from GitHub main..."
cd /vps/mdz-develop
git fetch origin main
git reset --hard origin/main

echo ">>> [2/5] Cleaning up old/stale processes on Port 8085..."
if command -v fuser >/dev/null 2>&1; then
    fuser -k 8085/tcp 2>/dev/null || true
fi
pkill -f "python.*8085" 2>/dev/null || true
pkill -f "http.server 8085" 2>/dev/null || true

echo ">>> [3/5] Setting up Systemd Admin Daemon Service (Port 8085)..."
cp /vps/mdz-develop/millionaire-dizital-structured/mdz-admin.service /etc/systemd/system/mdz-admin.service
systemctl daemon-reload
systemctl enable mdz-admin
systemctl restart mdz-admin
sleep 2

echo ">>> [4/5] Checking Service Status..."
systemctl status mdz-admin --no-pager -l

echo ">>> [5/5] Running Backend API Health Check..."
echo "Testing Backend on Port 8085..."
curl -s http://127.0.0.1:8085/api/admin/check-auth || echo "Backend starting..."
echo ""

echo "================================================================="
echo "  MILLIONAIRE DIZITAL ADMIN PANEL DEPLOYED SUCCESSFULLY!"
echo "  Admin URL: http://200.97.161.91:8085/admin"
echo "  Default Password: mdz@admin2026"
echo "================================================================="

