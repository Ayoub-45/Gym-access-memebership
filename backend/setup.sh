#!/bin/bash

echo "🔧 Setting up database..."

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_PATH="$SCRIPT_DIR/database/schema.sql"

# Check if schema file exists
if [ ! -f "$SCHEMA_PATH" ]; then
    echo "❌ Error: schema.sql not found at $SCHEMA_PATH"
    exit 1
fi

# Copy schema to /tmp with readable permissions
TMP_SCHEMA="/tmp/gym_schema_$(date +%s).sql"
cp "$SCHEMA_PATH" "$TMP_SCHEMA"
chmod 644 "$TMP_SCHEMA"

# Create database
# Drop existing database if neededecho "⚠️ Dropping existing database (dev only)..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS gym_access_membership;"
sudo -u postgres psql -c "CREATE DATABASE gym_access_membership;" 2>/dev/null \
  || echo "ℹ️  Database already exists"

# Create user
sudo -u postgres psql -c "CREATE USER gym_admin WITH PASSWORD 'gym_secure_password_2024';" 2>/dev/null \
  || echo "ℹ️  User already exists"

# Grant DB-level access
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gym_access_membership TO gym_admin;"

# Create schema & tables from the temporary file
sudo -u postgres psql -d gym_access_membership -f "$TMP_SCHEMA"

# Grant privileges
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL ON SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gym_admin;"

# Clean up temporary file
rm "$TMP_SCHEMA"

echo "✅ Database setup complete"