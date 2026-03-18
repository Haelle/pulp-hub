DC = devcontainer exec --workspace-folder .

.PHONY: up down recreate setup dev build check seed clean shell

up: ## Start the devcontainer
	devcontainer up --workspace-folder .

down: ## Stop the devcontainer
	docker stop $$(docker ps -q --filter label=devcontainer.local_folder=$$(pwd))

recreate: ## Destroy and rebuild the devcontainer
	docker rm -f $$(docker ps -aq --filter label=devcontainer.local_folder=$$(pwd)) 2>/dev/null || true
	devcontainer up --workspace-folder .

setup: ## Install deps + configure pulp-cli (interactive)
	$(DC) ./bin/setup.sh

dev: ## Start the dev server (http://localhost:5173)
	$(DC) bash -c "NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev -- --host 0.0.0.0"

build: ## Production build
	$(DC) npm run build

check: ## Type-check the project
	$(DC) npm run check

test: ## Run e2e tests (requires Pulp running)
	$(DC) bash -c "NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test"

test-ui: ## Run e2e tests in headed mode with slow-mo (host only)
	NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test --headed --slowmo=500

seed: ## Populate Pulp with test data
	$(DC) ./bin/seed.sh

clean: ## Remove seed data from Pulp
	$(DC) ./bin/clean.sh

shell: ## Open a shell inside the devcontainer
	$(DC) bash

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
