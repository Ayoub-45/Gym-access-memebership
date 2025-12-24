#!/bin/bash

# Database setup script for Gym Access Membership

echo "🔧 Setting up database..."

# Create database
sudo -u postgres psql -c "CREATE DATABASE gym_access_membership;" 2>/dev/null || echo "Database already exists"

# Create user
sudo -u postgres psql -c "CREATE USER gym_admin WITH PASSWORD 'gym_secure_password_2024';" 2>/dev/null || echo "User already exists"

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gym_access_membership TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL ON SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_membership -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gym_admin;"

# Create tables
sudo -u postgres psql -d gym_access_membership -f database/schema.sql

echo "✅ Database setup complete!"