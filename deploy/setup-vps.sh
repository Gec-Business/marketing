#!/bin/bash
# deploy/setup-vps.sh — Run on VPS as root/sudo
set -e

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
chown -R likuna:likuna /var/www/marketing

echo "=== Setting up PostgreSQL ==="
sudo -u postgres psql -c "CREATE USER marketing WITH PASSWORD 'mk_gec_2026_secure';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE marketing_db OWNER marketing;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE marketing_db TO marketing;"

echo "=== Enabling services ==="
systemctl enable postgresql
systemctl enable nginx
systemctl start postgresql
systemctl start nginx

echo ""
echo "=== Setup complete ==="
echo "Node: $(node --version)"
echo "PostgreSQL: $(psql --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "PM2: $(pm2 --version)"
