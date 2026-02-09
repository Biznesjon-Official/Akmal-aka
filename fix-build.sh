#!/bin/bash
cd /var/www/export/client
rm -rf .next
rm -rf node_modules/.cache
npm run build
