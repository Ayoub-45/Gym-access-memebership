#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting test environment setup..."

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================
# 1. Install Dependencies
# ============================================
echo ""
echo "📦 Installing dependencies..."
npm install

# ============================================
# 2. Setup Test Database
# ============================================
echo ""
echo "🗄️  Setting up test database..."

# Create test database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS gym_access_test;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE gym_access_test;"

# Create user if not exists
sudo -u postgres psql -c "CREATE USER gym_admin WITH PASSWORD 'gym_secure_password_2024';" 2>/dev/null \
  || echo "ℹ️  User gym_admin already exists"

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gym_access_test TO gym_admin;"

# Create schema from existing schema.sql
SCHEMA_PATH="$SCRIPT_DIR/database/schema.sql"

if [ ! -f "$SCHEMA_PATH" ]; then
    echo "❌ Error: schema.sql not found at $SCHEMA_PATH"
    exit 1
fi

# Copy schema to /tmp
TMP_SCHEMA="/tmp/gym_test_schema_$(date +%s).sql"
cp "$SCHEMA_PATH" "$TMP_SCHEMA"
chmod 644 "$TMP_SCHEMA"

# Apply schema to test database
sudo -u postgres psql -d gym_access_test -f "$TMP_SCHEMA"

# Grant all privileges to gym_admin
sudo -u postgres psql -d gym_access_test -c "GRANT ALL ON SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_test -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gym_admin;"
sudo -u postgres psql -d gym_access_test -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gym_admin;"

# Clean up
rm "$TMP_SCHEMA"

echo "✅ Test database setup complete"

# ============================================
# 3. Create .env.test if not exists
# ============================================
echo ""
echo "⚙️  Checking test environment variables..."

ENV_TEST_PATH="$SCRIPT_DIR/.env.test"
if [ ! -f "$ENV_TEST_PATH" ]; then
    echo "📝 Creating .env.test file..."
    cat > "$ENV_TEST_PATH" << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_access_test
DB_USER=gym_admin
DB_PASSWORD=gym_secure_password_2024

JWT_SECRET=test_secret_key_for_testing
NODE_ENV=test
EOF
    echo "✅ .env.test created"
else
    echo "ℹ️  .env.test already exists"
fi

# ============================================
# 4. Run Tests with Coverage
# ============================================
echo ""
echo "🧪 Running tests with coverage..."
echo "================================================"

npm test -- --coverage

# ============================================
# 5. Display Results
# ============================================
echo ""
echo "================================================"
echo "✅ All tests completed!"
echo ""
echo "📊 Coverage report generated in: coverage/"
echo "📄 Open coverage/lcov-report/index.html to view detailed coverage"
