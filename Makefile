.PHONY: test-up test-down test-exec test-run test-status test-setup test-clean

SLUG := $(shell basename $(CURDIR) | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
PROJECT := $(SLUG)_devcontainer
DC := devcontainer

check-deps:
	@command -v $(DC) >/dev/null 2>&1 || { echo "Error: devcontainer CLI required (npm i -g @devcontainers/cli)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "Error: docker required"; exit 1; }

test-up: check-deps
	$(DC) up --workspace-folder . || true
	$(MAKE) test-setup

test-setup:
	@docker compose -p $(PROJECT) exec -u node -w /workspace app bash .devcontainer/setup.sh

test-down:
	docker compose -p $(PROJECT) down -v

test-exec:
	@docker compose -p $(PROJECT) exec -u node -w /workspace app bash -c "$(CMD)"

test-run:
	$(MAKE) test-exec CMD="pnpm test"
	$(MAKE) test-exec CMD="pnpm test:e2e"

test-clean:
	@docker compose -p $(PROJECT) exec -u node -w /workspace app bash -c '\
		rm -rf shared/dist apps/api/dist apps/web/.next \
		       .turbo apps/api/.turbo apps/web/.turbo shared/.turbo \
		&& find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete \
		&& echo "[clean] Build caches removed"'

test-status:
	@docker compose -p $(PROJECT) ps 2>/dev/null || echo "No container running for $(SLUG)"
