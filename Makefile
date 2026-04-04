DC = devcontainer exec --workspace-folder .
PULP_DEV_NAME = pulp-dev
PULP_PROXY_NAME = pulp-proxy-dev
PULP_DEV_NET = pulp-dev-net

.PHONY: up down recreate setup shell dev build check lint format format-check audit quality test test-record test-ui screenshots seed clean create-pulp start-pulp stop-pulp reset-pulp help

# ── Devcontainer ─────────────────────────────────────────────

up: ## Start the devcontainer
	devcontainer up --workspace-folder .

down: ## Stop the devcontainer
	docker stop $$(docker ps -q --filter label=devcontainer.local_folder=$$(pwd))

recreate: ## Destroy and rebuild the devcontainer
	docker rm -f $$(docker ps -aq --filter label=devcontainer.local_folder=$$(pwd)) 2>/dev/null || true
	devcontainer up --workspace-folder .

setup: ## Install deps + configure pulp-cli (interactive)
	$(DC) ./bin/setup.sh

shell: ## Open a shell inside the devcontainer
	$(DC) bash

# ── Development ──────────────────────────────────────────────

dev: ## Start the dev server (http://localhost:5173)
	$(DC) bash -c "npm run dev -- --host 0.0.0.0"

build: ## Production build
	$(DC) npm run build

# ── Code quality ─────────────────────────────────────────────

check: ## Type-check (svelte-check + TypeScript)
	$(DC) npm run check

lint: ## Lint with ESLint (TS + Svelte rules)
	$(DC) npx eslint .

audit: ## Security audit of npm dependencies
	$(DC) npm audit --audit-level=moderate

format: ## Format code with Prettier
	$(DC) npx prettier --write .

format-check: ## Check formatting (no modifications)
	$(DC) npx prettier --check .

quality: check lint audit format-check ## All quality checks at once

# ── Tests ────────────────────────────────────────────────────

test: ## Run e2e tests (records new tapes, replays existing)
	$(DC) bash -c "npx playwright test $(FILE)"

test-record: ## Re-record all tapes from scratch (requires Pulp) 
	     ## only one worker to avoid multiple tests writing at the same time
	$(DC) bash -c "rm -rf e2e/tapes && npx playwright test --workers=1 $(FILE)"

test-ui: ## Run e2e tests in headed mode with slow-mo (host)
	SLOWMO=500 npx playwright test --headed

screenshots: ## Capture screenshots for docs
	$(DC) bash -c "npx playwright test e2e/screenshots.test.ts"

# ── Pulp instance ────────────────────────────────────────────

seed: ## Populate Pulp with test data
	./bin/seed.sh

clean: ## Remove seed data from Pulp
	./bin/clean.sh

create-pulp: ## Create Pulp + CORS proxy containers (first time)
	docker network create $(PULP_DEV_NET) 2>/dev/null || true
	docker run -d \
		--name $(PULP_DEV_NAME) \
		--network $(PULP_DEV_NET) \
		--network-alias pulp \
		-v pulp-dev-settings:/etc/pulp \
		-v pulp-dev-storage:/var/lib/pulp \
		-v pulp-dev-db:/var/lib/pgsql \
		-e PULP_DEFAULT_ADMIN_PASSWORD=admin \
		-e PULP_CONTENT_ORIGIN=http://localhost:8081 \
		-e PULP_TOKEN_AUTH_DISABLED=true \
		--device /dev/fuse \
		pulp/pulp
	docker run -d \
		--name $(PULP_PROXY_NAME) \
		--network $(PULP_DEV_NET) \
		-p 8081:80 \
		-v $$(pwd)/nginx/pulp-cors-proxy.conf:/etc/nginx/nginx.conf:ro \
		nginx:alpine

start-pulp: ## Start existing Pulp + proxy containers
	docker start $(PULP_DEV_NAME) $(PULP_PROXY_NAME)

stop-pulp: ## Stop Pulp + proxy containers
	docker stop $(PULP_PROXY_NAME) $(PULP_DEV_NAME) 2>/dev/null || true

reset-pulp: stop-pulp ## Destroy Pulp containers, volumes and network (full reset)
	docker rm -f $(PULP_DEV_NAME) $(PULP_PROXY_NAME) 2>/dev/null || true
	docker volume rm pulp-dev-settings pulp-dev-storage pulp-dev-db 2>/dev/null || true
	docker network rm $(PULP_DEV_NET) 2>/dev/null || true
	@echo "\033[32m✓ Pulp reset. Run 'make create-pulp' to start fresh.\033[0m"

# ── Help ─────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
