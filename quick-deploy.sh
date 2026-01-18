#!/bin/bash

# Quick deployment script - faqat rebuild va restart
# Usage: bash quick-deploy.sh

set -e

echo "⚡ Quick deployment starting..."

cd /root/export/client

# Clean and rebuild
echo "🧹 Cleaning..."
rm -rf .next

echo "🔨 Building..."
npm run build

echo "🔄 Restarting..."
cd /root/export
pm2 restart akmal-aka-frontend

echo "✅ Done! Check: https://akmalaka.biznejon.uz"
