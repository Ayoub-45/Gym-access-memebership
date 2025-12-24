#!/bin/bash

echo "🔧 Setting up database..."

SCHEMA_PATH="/tmp/schema.sql"

# Copy schema to readable location
cp "$(dirname "$0")/database/schema.sql" "$SCHEMA_PATH"

# Create database
sudo -u postgres psql -c "CREATE DATABASE gym_access_membership;" \
  || echo "Database already exists"

# Create user
sudo -u postgres psql -c "CREATE USER gym_admin WITH PASSWORD 'gym_secure_password_2024';" \
  || echo "User already exists"

# Grant DB-level access
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gym_access_membership TO gym_admin;"

# Create schema & tables
sudo -u postgres psql -d gym_access_membership -f "$SCHEMA_PATH"

# Grant privileges
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL ON SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gym_admin;"

echo "✅ Database setup complete"
