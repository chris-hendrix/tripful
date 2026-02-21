.PHONY: dev-up dev-down dev-exec dev-list dev-clean dev-shell dev-logs dev-restart

# Resolve branch -> worktree path
BRANCH    ?= $(shell git branch --show-current)
SLUG       = $(shell echo "$(BRANCH)" | tr '/' '-' | tr '_' '-' | tr '[:upper:]' '[:lower:]' | cut -c1-60)
WORKTREE   = ../tripful--$(SLUG)
DC         = devcontainer

# Check that devcontainer CLI is installed
check-deps:
	@command -v $(DC) >/dev/null 2>&1 || { echo "Error: 'devcontainer' CLI not found. Install with: npm i -g @devcontainers/cli"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "Error: 'docker' not found."; exit 1; }

# Create worktree + start isolated devcontainer + show ports
dev-up: check-deps
	@start=$$(date +%s); \
	if [ ! -d "$(WORKTREE)" ]; then \
	  git worktree add "$(WORKTREE)" "$(BRANCH)" 2>/dev/null \
	    || git worktree add "$(WORKTREE)" "origin/$(BRANCH)" \
	    || { echo "Error: branch '$(BRANCH)' not found locally or in origin"; exit 1; }; \
	fi; \
	$(DC) up --workspace-folder "$(WORKTREE)"; \
	echo ""; \
	echo "=== $(BRANCH) is ready ==="; \
	cid=$$(docker ps -q --filter "label=devcontainer.local_folder=$$(realpath $(WORKTREE))"); \
	if [ -n "$$cid" ]; then \
	  web=$$(docker port "$$cid" 3000 2>/dev/null | head -1); \
	  api=$$(docker port "$$cid" 8000 2>/dev/null | head -1); \
	  echo "  Web:  $${web:-not exposed}"; \
	  echo "  API:  $${api:-not exposed}"; \
	fi; \
	end=$$(date +%s); \
	echo "  Time: $$(( end - start ))s"

# Run a command inside the branch's container
# Usage: make dev-exec BRANCH=feature/auth CMD="pnpm test"
#        make dev-exec BRANCH=feature/auth CMD="pnpm lint && pnpm typecheck"
dev-exec: check-deps
	@$(DC) exec --workspace-folder "$(WORKTREE)" $(CMD)

# Stop container (keeps worktree on disk)
dev-down: check-deps
	@cid=$$(docker ps -q --filter "label=devcontainer.local_folder=$$(realpath $(WORKTREE))"); \
	if [ -n "$$cid" ]; then \
	  docker stop "$$cid"; \
	  echo "Stopped container for $(BRANCH)"; \
	else \
	  echo "No running container for $(BRANCH)"; \
	fi
	@if [ -d "$(WORKTREE)" ]; then \
	  git worktree remove "$(WORKTREE)" 2>/dev/null \
	    || echo "Worktree has changes — kept at $(WORKTREE). Use git worktree remove --force to delete."; \
	fi

# Restart container without removing worktree
dev-restart: check-deps
	@cid=$$(docker ps -q --filter "label=devcontainer.local_folder=$$(realpath $(WORKTREE))"); \
	[ -n "$$cid" ] && docker stop "$$cid" || true
	@$(DC) up --workspace-folder "$(WORKTREE)"

# Open interactive shell in the container
dev-shell: check-deps
	@$(DC) exec --workspace-folder "$(WORKTREE)" bash

# Tail container logs
dev-logs: check-deps
	@cid=$$(docker ps -q --filter "label=devcontainer.local_folder=$$(realpath $(WORKTREE))"); \
	if [ -n "$$cid" ]; then \
	  docker logs -f "$$cid"; \
	else \
	  echo "No running container for $(BRANCH)"; \
	fi

# Show all branch environments, status, and ports
dev-list:
	@printf "%-25s %-10s %-20s %s\n" "BRANCH" "STATUS" "PORTS" "PATH"; \
	found=0; \
	for wt in ../tripful--*; do \
	  [ -d "$$wt" ] || continue; \
	  found=1; \
	  name=$$(basename "$$wt" | sed 's/^tripful--//'); \
	  cid=$$(docker ps -q --filter "label=devcontainer.local_folder=$$(realpath $$wt)"); \
	  if [ -n "$$cid" ]; then \
	    web=$$(docker port "$$cid" 3000 2>/dev/null | head -1 | sed 's/.*://'); \
	    api=$$(docker port "$$cid" 8000 2>/dev/null | head -1 | sed 's/.*://'); \
	    printf "%-25s %-10s %-20s %s\n" "$$name" "running" "web:$${web:-?} api:$${api:-?}" "$$wt"; \
	  else \
	    printf "%-25s %-10s %-20s %s\n" "$$name" "stopped" "-" "$$wt"; \
	  fi; \
	done; \
	[ "$$found" -eq 0 ] && echo "(no environments found)"

# Remove all stopped envs
dev-clean:
	@to_remove=""; \
	for wt in ../tripful--*; do \
	  [ -d "$$wt" ] || continue; \
	  cid=$$(docker ps -q --filter "label=devcontainer.local_folder=$$(realpath $$wt)"); \
	  if [ -z "$$cid" ]; then \
	    to_remove="$$to_remove $$wt"; \
	  fi; \
	done; \
	if [ -z "$$to_remove" ]; then \
	  echo "No stopped environments to clean."; \
	else \
	  echo "Will remove:$$to_remove"; \
	  printf "Continue? [y/N] "; \
	  read -r ans; \
	  if [ "$$ans" = "y" ] || [ "$$ans" = "Y" ]; then \
	    for wt in $$to_remove; do \
	      echo "Removing $$wt"; \
	      git worktree remove "$$wt" --force 2>/dev/null || rm -rf "$$wt"; \
	    done; \
	    echo "Done. Run 'docker volume prune' to reclaim disk space."; \
	  else \
	    echo "Aborted."; \
	  fi; \
	fi
