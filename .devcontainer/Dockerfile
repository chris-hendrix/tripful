FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Enable corepack for pnpm (version from package.json)
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Install turbo globally (npm avoids pnpm global dir permission issues)
RUN npm install -g turbo

# Install Playwright system dependencies + Chromium
# Run as node user so browser cache is in the right place for test runs
USER node
RUN npx playwright install --with-deps chromium
USER root
