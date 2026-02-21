FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Enable corepack for pnpm (version from package.json)
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# Install turbo globally (npm avoids pnpm global dir permission issues)
RUN npm install -g turbo

# Install Playwright system dependencies (requires root)
RUN npx playwright install-deps chromium

# Install Playwright browser as node user (cache lands in /home/node)
USER node
RUN npx playwright install chromium
USER root
