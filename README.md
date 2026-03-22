# PulpHub

A Pulp repository viewer UI, inspired by Docker Hub.

Supports container (OCI) repositories, file repositories, and pull-through cache display (DockerHub, Quay.io, PyPI, npm) with client configuration commands.

Image on [DockerHub](https://hub.docker.com/repository/docker/estb/pulp-hub/)

## Installation

### Prerequisites

- Docker with Docker Compose
- pip/pipx (for pulp-cli)

### Quick start

```bash
# 1. Start Pulp + PulpHub
docker compose -f docker-compose.demo.yml up -d
# Wait ~30s for Pulp to fully start

# 2. Populate Pulp with test data
pip install pulp-cli[container]
# configured by default to work with the docker-compose Pulp instance
./bin/setup.sh
# populates the Pulp instance configured via ./bin/setup.sh
./bin/seed.sh

# 3. Open PulpHub
# http://localhost:8080
# Pulp URL: http://localhost:8081
# Credentials: admin / admin
```

### Use with an existing Pulp instance

```bash
docker run -d -p 8080:80 docker.io/estb/pulp-hub:latest
```

Open http://localhost:8080 and point the login to your Pulp instance URL.

> **CORS**: the Pulp instance must allow cross-origin requests.

### Pull-through cache (OCI)

To test an image pull through the pull-through cache over HTTP (local dev):

```bash
# Login (required once)
podman login --tls-verify=false localhost:8081 -u admin -p admin

# Pull through the cache
podman pull --tls-verify=false localhost:8081/dockerhub-cache/library/nginx:latest
```

> **Note**: `--tls-verify=false` is required because Pulp is exposed over HTTP. In production with TLS, this flag is not needed.

### Docker Hub authentication (optional)

To bypass Docker Hub rate limiting during seeding, `seed.sh` supports authentication via environment variables:

```bash
# Edit .env with your credentials
cp .env.example .env
./bin/seed.sh
```

The password is a [Personal Access Token](https://hub.docker.com/settings/security), not the account password.
Without these variables, `seed.sh` works normally in anonymous mode.

## Development

### Dev prerequisites

- [Dev Containers CLI](https://github.com/devcontainers/cli) (`npm install -g @devcontainers/cli`)
- Docker

### Start Pulp for development

```bash
make create-pulp   # First time: creates Pulp + CORS proxy on http://localhost:8081
# Wait ~30s for Pulp to start

make start-pulp    # Restart after a stop
```

### Devcontainer

```bash
make up            # Start the devcontainer
make setup         # Configure pulp-cli (default URL: http://host.docker.internal:8081)
make seed          # Populate Pulp with test data
make dev           # Start the dev server (http://localhost:5173)
```

### Stop Pulp

```bash
make stop-pulp
```

### Commands

```bash
make help
```

### Tests

```bash
make test          # E2E Playwright
make test-record   # Re-record tapes
```

## Pulp reference

### On-demand mode

Pulp operates in `on_demand` mode: during a `sync`, only **metadata** (manifests, tags) are downloaded. **Layers** (blobs) are fetched on demand during a `pull`.

Consequence: only synced tags are available. To add a new tag:

```bash
# Add a tag to the remote filter
pulp container remote update \
  --name "dockerhub/library/alpine" \
  --include-tags '["3.17","3.18","3.19","latest"]'

# Re-sync the repo
pulp container repository sync \
  --name "dockerhub/library/alpine" \
  --remote "dockerhub/library/alpine"
```

### Tag management

Only tags filtered via `--include-tags` on the remote are synced.
A `pull` on a non-synced tag will return `manifest unknown`.

### Docker Hub rate limiting

Without authentication, Docker Hub limits to ~100 pulls/6h.
Each synced tag consumes pulls (manifests + layers).
This is why `--include-tags` filters on a small number of tags in `seed.sh`.
Without this filter, syncing `alpine` would pull hundreds of tags and exhaust the quota.
