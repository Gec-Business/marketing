#!/bin/bash
# deploy/setup-vps.sh — Run on VPS as root/sudo
# Usage: sudo ./setup-vps.sh [deploy_user]
set -e

DEPLOY_USER="${1:-$(whoami)}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24)}"

echo "=== Updating system ==="
apt update && apt upgrade -y

echo "=== Installing Node.js 22 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

echo "=== Installing PostgreSQL 16 ==="
apt install -y postgresql postgresql-contrib

echo "=== Installing Nginx ==="
apt install -y nginx

echo "=== Installing PM2 ==="
npm install -g pm2

echo "=== Installing Certbot ==="
apt install -y certbot python3-certbot-nginx

echo "=== Creating app directories ==="
mkdir -p /var/www/marketing/uploads/generated
mkdir -p /var/www/marketing/logs
mkdir -p /var/www/marketing/backups
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" /var/www/marketing

echo "=== Setting up PostgreSQL ==="
sudo -u postgres psql -c "CREATE USER marketing WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE marketing_db OWNER marketing;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE marketing_db TO marketing;"

echo "=== Enabling services ==="
systemctl enable postgresql
systemctl enable nginx
systemctl start postgresql
systemctl start nginx

echo "=== Deploying application ==="
cd /var/www/marketing
if [ -f package.json ]; then
  npm install --production
  npm run build
  # Copy static files for standalone mode
  cp -r public .next/standalone/public 2>/dev/null || echo "No public dir"
  cp -r .next/static .next/standalone/.next/static
  echo "Build complete"
fi

echo ""
echo "=== Setup complete ==="
echo "Node: $(node --version)"
echo "PostgreSQL: $(psql --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "PM2: $(pm2 --version)"
echo ""
echo "DB Password: ${DB_PASSWORD}"
echo "Save this password! Set it in DATABASE_URL in .env"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and fill in values"
echo "  2. Run the database schema: psql -U marketing -d marketing_db -f lib/db-schema.sql"
echo "  3. Run migrations: psql -U marketing -d marketing_db -f lib/db-migration-001.sql"
echo "  4. Copy nginx config: cp deploy/nginx.conf /etc/nginx/sites-available/marketing"
echo "  5. Enable site: ln -sf /etc/nginx/sites-available/marketing /etc/nginx/sites-enabled/"
echo "  6. Reload nginx: nginx -t && systemctl reload nginx"
echo "  7. Start app: pm2 start deploy/ecosystem.config.js"
echo "  8. Save PM2: pm2 save && pm2 startup"
