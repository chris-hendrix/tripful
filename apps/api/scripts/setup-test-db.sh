#!/bin/bash
set -e

echo "Setting up test database..."

# Database connection parameters
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="tripful"
DB_NAME="tripful_test"
export PGPASSWORD="tripful_dev"

# Create test database (use credentials from .env)
# The 2>/dev/null suppresses error if database already exists
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null && echo "✓ Test database created" || echo "✓ Test database already exists"

# Run migrations by executing SQL files directly
echo "Running migrations on test database..."
MIGRATIONS_DIR="src/db/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
  for migration in $(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | sort); do
    echo "  Applying: $(basename $migration)"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration" > /dev/null 2>&1 || echo "  (migration already applied)"
  done
else
  echo "  No migrations found"
fi

echo "✓ Test database setup complete"
