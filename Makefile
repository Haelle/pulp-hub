DC = devcontainer exec --workspace-folder .
PULP_DEV_NAME = pulp-dev
PULP_PROXY_NAME = pulp-proxy-dev
PULP_DEV_NET = pulp-dev-net

.PHONY: up down recreate setup dev build check test test-ui test-record screenshots seed clean shell create-pulp start-pulp stop-pulp help


up: ## Start the devcontainer
	devcontainer up --workspace-folder .

down: ## Stop the devcontainer
	docker stop $$(docker ps -q --filter label=devcontainer.local_folder=$$(pwd))

recreate: ## Destroy and rebuild the devcontainer
	docker rm -f $$(docker ps -aq --filter label=devcontainer.local_folder=$$(pwd)) 2>/dev/null || true
	devcontainer up --workspace-folder .

setup: ## Install deps + configure pulp-cli (interactive) in dev container
	$(DC) ./bin/setup.sh

dev: ## Start the dev server (http://localhost:5173)
	$(DC) bash -c "npm run dev -- --host 0.0.0.0"

build: ## Production build
	$(DC) npm run build

check: ## Type-check the project
	$(DC) npm run check

test: ## Run e2e tests (records new tapes, replays existing)
	$(DC) bash -c "npx playwright test"

test-record: ## Re-record all tapes from scratch (requires Pulp running)
	$(DC) bash -c "rm -rf e2e/tapes && TALKBACK_RECORD=NEW npx playwright test"

test-ui: ## Run e2e tests in headed mode with slow-mo (host only)
	SLOWMO=500 npx playwright test --headed

screenshots: ## Capture screenshots for docs
	$(DC) bash -c "npx playwright test e2e/screenshots.test.ts"

seed: ## Populate remote Pulp with test data (supports DOCKERHUB_USERNAME/PASSWORD)
	./bin/seed.sh

clean: ## Remove seed data from remote Pulp
	./bin/clean.sh

shell: ## Open a shell inside the devcontainer
	$(DC) bash

create-pulp: ## Create Pulp + CORS proxy containers for development (first time)
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

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
