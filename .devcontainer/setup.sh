#!/usr/bin/env bash
set -euo pipefail

# Create symlink for project settings to match container workspace path
# Host: ~/.claude/projects/${HOST_PROJECT_SLUG}
# Container: ~/.claude/projects/-workspace
if [ -n "${HOST_PROJECT_SLUG:-}" ]; then
  mkdir -p ~/.claude/projects

  if [ -d ~/.claude/projects/"${HOST_PROJECT_SLUG}" ]; then
    echo "Linking project settings: ${HOST_PROJECT_SLUG} -> -workspace"
    ln -sfn ~/.claude/projects/"${HOST_PROJECT_SLUG}" ~/.claude/projects/-workspace
  else
    echo "Warning: Project settings not found at ~/.claude/projects/${HOST_PROJECT_SLUG}"
    echo "If this is your first time using this devcontainer, this is expected."
  fi
fi

# Note: Host username symlink for plugins is created in Dockerfile (requires root)

# Generate a random JWT secret if not provided
if [ -z "${JWT_SECRET:-}" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  echo "Generated random JWT_SECRET for development"
fi

# Create API .env with container-appropriate DATABASE_URL
# (db:5432 instead of localhost:5433 — 'db' is the compose service name)
cat > apps/api/.env << EOF
NODE_ENV=development
PORT=8000
HOST=0.0.0.0
DATABASE_URL=postgresql://tripful:tripful_dev@db:5432/tripful
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp
EOF

# Create web .env.local
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api
API_URL=http://localhost:8000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF

# Install dependencies
pnpm install

# Run database migrations
cd apps/api && pnpm db:migrate
