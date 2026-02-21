.PHONY: test-up test-down test-exec test-run test-status

SLUG := $(shell basename $(CURDIR) | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
PROJECT := $(SLUG)_devcontainer
DC := devcontainer

check-deps:
	@command -v $(DC) >/dev/null 2>&1 || { echo "Error: devcontainer CLI required (npm i -g @devcontainers/cli)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "Error: docker required"; exit 1; }

test-up: check-deps
	$(DC) up --workspace-folder .

test-down:
	docker compose -p $(PROJECT) down -v

test-exec:
	@docker compose -p $(PROJECT) exec -u node -w /workspace app $(CMD)

test-run:
	$(MAKE) test-exec CMD="pnpm test"
	$(MAKE) test-exec CMD="pnpm test:e2e"

test-status:
	@docker compose -p $(PROJECT) ps 2>/dev/null || echo "No container running for $(SLUG)"
