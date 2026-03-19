# PulpHub

UI de visualisation des dépôts d'images container Pulp, inspirée de Docker Hub.

Image sur [DockerHub](https://hub.docker.com/repository/docker/estb/pulp-hub/)

## Installation

### Prérequis

- Docker avec Docker Compose
- pip/pipx (pour pulp-cli)

### Démarrage rapide

```bash
# 1. Lancer Pulp + PulpHub
docker compose -f docker-compose.demo.yml up -d
# Attendre ~30s que Pulp démarre complètement

# 2. Peupler Pulp avec des données de test
pip install pulp-cli[container]
# configuré par défaut pour fonctionner avec le pulp du docker-compose
./bin/setup.sh
# peuple le Pulp configuré via ./bin/setup.sh
./bin/seed.sh

# 3. Ouvrir PulpHub
# http://localhost:8080
# Pulp URL : http://localhost:8081
# Identifiants : admin / admin
```

### Utiliser avec une instance Pulp existante

```bash
docker run -d -p 8080:80 docker.io/estb/pulp-hub:latest
```

Ouvrir http://localhost:8080 et pointer le login vers l'URL de votre instance Pulp.

> **CORS** : l'instance Pulp doit autoriser les requêtes cross-origin.

### Authentification Docker Hub (optionnel)

Pour contourner le rate limiting Docker Hub lors du seed, `seed.sh` supporte l'auth via variables d'environnement :

```bash
# Éditer .env avec vos credentials
cp .env.example .env
./bin/seed.sh
```

Le password est un [Personal Access Token](https://hub.docker.com/settings/security), pas le mot de passe du compte.
Sans ces variables, `seed.sh` fonctionne normalement en anonyme.

## Développement

### Prérequis pour le dev

- [Dev Containers CLI](https://github.com/devcontainers/cli) (`npm install -g @devcontainers/cli`)
- Docker

### Lancer Pulp pour le dev

```bash
make create-pulp   # Première fois : crée Pulp + proxy CORS sur http://localhost:8081
# Attendre ~30s que Pulp démarre

make start-pulp    # Relancer après un stop
```

### Devcontainer

```bash
make up            # Démarre le devcontainer
make setup         # Configure pulp-cli (URL par défaut : http://host.docker.internal:8081)
make seed          # Peuple Pulp avec des données de test
make dev           # Lance le serveur de dev (http://localhost:5173)
```

### Arrêter Pulp

```bash
make stop-pulp
```

### Commandes

```bash
make help
```

### Tests

```bash
make test          # E2E Playwright
make test-record   # Re-enregistrer les cassettes
```

## Référence Pulp

### Mode on_demand

Pulp fonctionne en mode `on_demand` : lors d'un `sync`, seules les **metadata** (manifests, tags) sont téléchargées. Les **layers** (blobs) sont tirés à la demande lors d'un `pull`.

Conséquence : seuls les tags synchronisés sont disponibles. Pour ajouter un nouveau tag :

```bash
# Ajouter un tag au filtre du remote
pulp container remote update \
  --name "dockerhub/library/alpine" \
  --include-tags '["3.17","3.18","3.19","latest"]'

# Re-synchroniser le repo
pulp container repository sync \
  --name "dockerhub/library/alpine" \
  --remote "dockerhub/library/alpine"
```

### Gestion des tags

Seuls les tags filtrés via `--include-tags` sur le remote sont synchronisés.
Un `pull` sur un tag non synchronisé retournera `manifest unknown`.

### Rate limiting Docker Hub

Sans authentification, Docker Hub limite à ~100 pulls/6h.
Chaque tag synchronisé consomme des pulls (manifests + layers).
C'est pourquoi `--include-tags` filtre sur un petit nombre de tags dans `seed.sh`.
Sans ce filtre, une sync d'`alpine` tirerait des centaines de tags et épuiserait le quota.
