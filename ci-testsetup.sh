#!/bin/bash

set -e  # Exit immediately on error

echo "🚀 Starting CI test environment setup..."

# ============================================
# 1. Check required environment variables
# ============================================
echo "🔍 Checking required environment variables..."

REQUIRED_VARS=(
  DB_HOST
  DB_PORT
  DB_NAME
  DB_USER
  DB_PASSWORD
  NODE_ENV
)

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ Environment variable $VAR is not set"
    exit 1
  fi
done

echo "✅ Environment variables are set"

# ============================================
# 2. Install dependencies
# ============================================
echo ""
echo "📦 Installing dependencies..."
npm install

# ============================================
# 3. Wait for PostgreSQL to be ready
# ============================================
echo ""
echo "🗄️  Waiting for PostgreSQL to be ready..."

until pg_isready \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" >/dev/null 2>&1
do
  echo "⏳ PostgreSQL not ready yet, retrying..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

# ============================================
# 4. Apply database schema
# ============================================
echo ""
echo "📄 Applying database schema..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_PATH="$SCRIPT_DIR/database/schema.sql"

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "❌ schema.sql not found at $SCHEMA_PATH"
  exit 1
fi

PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$SCHEMA_PATH"

echo "✅ Schema applied successfully"

# ============================================
# 5. Run tests with coverage
# ============================================
echo ""
echo "🧪 Running tests with coverage..."
echo "================================================"

npm test -- --coverage

# ============================================
# 6. Done
# ============================================
echo ""
echo "================================================"
echo "✅ CI tests completed successfully"
echo "📊 Coverage report available in coverage/"
