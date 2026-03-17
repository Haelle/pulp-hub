# PulpHub

UI de visualisation des dépôts d'images container Pulp, inspirée de Docker Hub.

## Setup

```bash
# Install dependencies and configure pulp-cli
./bin/setup.sh
```

## Seed data

```bash
# Populate Pulp with test container images (alpine, busybox, hello-world)
./bin/seed.sh

# Remove all seed data
./bin/clean.sh
```

### Verify seed data

```bash
# List seed distributions
pulp container distribution list

# List remotes
pulp container remote list

# List repositories and their sync status
pulp container repository list

# Check tags for a specific repo
pulp --format json container repository version list \
  --repository dockerhub/library/alpine
```
