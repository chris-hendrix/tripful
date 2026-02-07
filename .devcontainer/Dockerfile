FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Install Playwright system dependencies + Chromium
RUN npx playwright install --with-deps chromium

# Install turbo globally
ENV PNPM_HOME="/usr/local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm add -g turbo

# Grant node user ownership of pnpm directory
RUN chown -R node:node /usr/local/share/pnpm

# Install Claude Code for node user
USER node
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/node/.local/bin:$PATH"

# Configure global gitignore (mounted via docker-compose)
RUN git config --global core.excludesFile /home/node/.gitignore_global

USER root

# Create symlink for Claude plugin paths
# Plugins may reference absolute paths from the host (e.g., /home/username/.claude)
# This symlink allows those paths to work in the container
ARG HOST_USERNAME
RUN if [ -n "$HOST_USERNAME" ]; then \
      mkdir -p /home/$HOST_USERNAME && \
      ln -sfn /home/node/.claude /home/$HOST_USERNAME/.claude; \
    fi
