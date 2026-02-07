# Devcontainer Setup

This devcontainer provides a complete development environment for Tripful with PostgreSQL, Node.js, and Claude Code CLI.

## Quick Start

1. **Export required environment variables** in your shell:
   ```bash
   # Add to your ~/.bashrc or ~/.zshrc
   export HOST_USERNAME=yourusername
   export HOST_PROJECT_SLUG=-home-yourusername-git-tripful
   ```

2. **Authenticate Claude on host** (before opening devcontainer):
   ```bash
   # On your host machine (not in devcontainer)
   claude login
   ```

3. **Open in devcontainer**: Command Palette → "Dev Containers: Reopen in Container"

> **Important:** The `HOST_USERNAME` and `HOST_PROJECT_SLUG` variables must be exported in your shell environment, not just in a `.env` file, because devcontainer.json reads from your host environment.

## What Gets Mounted

- **`~/.claude`** → Claude config, authentication, plugins, and project settings
- **`~/.gitignore_global`** → Your global git ignore rules (readonly)

## Claude Plugin Support

### Installed Marketplace Plugins

Marketplace plugins installed in `~/.claude/plugins/` are automatically available in the container.

### Local Plugin Development (Optional)

If you're developing Claude plugins locally:

1. **Add the mount** directly to `devcontainer.json` mounts array (replace with your actual path):
   ```json
   "source=/home/username/git/my-plugin,target=/home/username/git/my-plugin,type=bind"
   ```

2. **Rebuild the container** for changes to take effect

3. **Link the plugin** inside the container:
   ```bash
   claude plugin add /home/username/git/my-plugin
   ```

> **Note:** Use absolute paths, not environment variables, to avoid mount failures if the variable isn't set.

## How It Works

### Path Compatibility

Claude plugins may reference absolute paths from your host system. The devcontainer creates symlinks to ensure these paths work:

- **Host**: `/home/yourusername/.claude`
- **Container**: `/home/node/.claude` (actual mount)
- **Symlink**: `/home/yourusername/.claude` → `/home/node/.claude` (for compatibility)

### Project Settings

Claude stores project-specific settings using a "slug" derived from the project path:
- **Host**: `~/.claude/projects/-home-yourusername-git-tripful` (set via `HOST_PROJECT_SLUG`)
- **Container**: `~/.claude/projects/-workspace`

The setup script creates a symlink so your conversation history and project memory transfer seamlessly.

**Finding your project slug**: Check `~/.claude/projects/` on your host and find the directory that matches this repository.

## Troubleshooting

### Plugins not loading

1. Verify `.devcontainer/.env` has `HOST_USERNAME` set correctly
2. Rebuild the container: Command Palette → "Dev Containers: Rebuild Container"
3. Check that plugins are installed on host: `ls ~/.claude/plugins/`

### Authentication not working

1. Authenticate on the **host** machine first (not inside the container)
2. Run `claude login` on your host before opening the devcontainer
3. Verify credentials exist: `ls ~/.claude/.credentials.json`

### Project settings not transferring

1. Ensure `HOST_USERNAME` and workspace path match your host setup
2. Check setup script output: `bash .devcontainer/setup.sh`
3. Verify the symlink: `ls -la ~/.claude/projects/`

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `HOST_USERNAME` | **Yes** | Your host system username | `john` |
| `HOST_PROJECT_SLUG` | **Yes** | Claude project directory slug | `-home-john-git-tripful` |
| `JWT_SECRET` | No | JWT secret for API auth (auto-generated if not set) | `your-secret-minimum-32-chars` |
| `CLAUDE_LOCAL_PLUGIN_PATH` | No | Path to local plugin dev directory | `/home/john/git/my-plugin` |

## Files

- **`.env`** - Your local configuration (gitignored)
- **`.env.example`** - Template for new users
- **`Dockerfile`** - Container image with Node.js, pnpm, Playwright, Claude CLI
- **`docker-compose.yml`** - Multi-service setup (app + PostgreSQL)
- **`devcontainer.json`** - VS Code devcontainer configuration
- **`setup.sh`** - Post-create initialization script
