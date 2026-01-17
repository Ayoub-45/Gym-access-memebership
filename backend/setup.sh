#!/bin/bash

echo "🔧 Setting up database..."

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_PATH="$SCRIPT_DIR/database/schema.sql"
MIGRATION_PATH="$SCRIPT_DIR/database/migration_qr_sessions.sql"

# Check if schema file exists
if [ ! -f "$SCHEMA_PATH" ]; then
    echo "❌ Error: schema.sql not found at $SCHEMA_PATH"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_PATH" ]; then
    echo "❌ Error: migration_qr_sessions.sql not found at $MIGRATION_PATH"
    exit 1
fi

# Copy files to /tmp with readable permissions
TMP_SCHEMA="/tmp/gym_schema_$(date +%s).sql"
TMP_MIGRATION="/tmp/gym_migration_$(date +%s).sql"

cp "$SCHEMA_PATH" "$TMP_SCHEMA"
cp "$MIGRATION_PATH" "$TMP_MIGRATION"

chmod 644 "$TMP_SCHEMA"
chmod 644 "$TMP_MIGRATION"

# Drop existing database (dev only)
echo "⚠️  Dropping existing database (dev only)..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS gym_access_membership;"

# Create database
echo "📦 Creating database..."
sudo -u postgres psql -c "CREATE DATABASE gym_access_membership;" 2>/dev/null \
  || echo "ℹ️  Database already exists"

# Create user
echo "👤 Creating user..."
sudo -u postgres psql -c "CREATE USER gym_admin WITH PASSWORD 'gym_secure_password_2024';" 2>/dev/null \
  || echo "ℹ️  User already exists"

# Grant DB-level access
echo "🔐 Granting database privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gym_access_membership TO gym_admin;"

# Create schema & tables from schema.sql
echo "📋 Running schema.sql..."
sudo -u postgres psql -d gym_access_membership -f "$TMP_SCHEMA"

# Run migration to add qr_sessions table
echo "🔄 Running migration_qr_sessions.sql..."
sudo -u postgres psql -d gym_access_membership -f "$TMP_MIGRATION"

# Grant privileges on all tables
echo "🔑 Granting table privileges..."
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL ON SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gym_admin;"

# Clean up temporary files
rm "$TMP_SCHEMA"
rm "$TMP_MIGRATION"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📊 Tables created:"
sudo -u postgres psql -d gym_access_membership -c "\dt"
echo ""
echo "🎉 You can now run: npm run dev"
