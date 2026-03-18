# PulpHub — Instructions Claude Code

## Projet

UI de visualisation de dépôts d'images container Pulp, inspirée de Docker Hub.
Stack : SvelteKit (Svelte 5 runes) + shadcn-svelte + Tailwind CSS v4 + adapter-node.

## Développement

- utiliser `make` autant que possible, s'il manque des opérations les ajouter
- ne pas tenter de lancer le serveur ou des tests en dehors du devcontainer
- Le dev se fait dans un devcontainer (Docker) — toutes les commandes passent par `make`
- `make dev` lance le serveur avec `NODE_TLS_REJECT_UNAUTHORIZED=0` (certificat auto-signé Pulp)
- `make recreate` est nécessaire après modification de `devcontainer.json` ou du `Dockerfile`
- `forwardPorts` dans `devcontainer.json` ne fonctionne qu'avec VS Code — utiliser `-p` dans `runArgs` pour la CLI

## Pulp

- Instance Pulp sur l'hôte via Podman, exposée en `https://pulp.local:8443`
- Le devcontainer y accède via `--add-host=pulp.local:host-gateway`
- Auth : session Django (`GET /auth/login/` pour CSRF, `POST /auth/login/` avec credentials → cookie `sessionid`)
- PulpHub stocke le `sessionid` dans un cookie httpOnly côté SvelteKit, jamais exposé au client
- Le `fetch` natif de Node 24 (undici) ignore l'option `agent` — seul `NODE_TLS_REJECT_UNAUTHORIZED=0` fonctionne pour les certificats auto-signés
- `pulp-cli` : `remote create` ne supporte pas `--include-tags`, utiliser `remote update` après le create
- Les tags sont limités dans seed.sh pour éviter les 429 Docker Hub (rate limit ~100 pulls/6h sans auth)

## Conventions

- Voir PLAN.md pour le plan de développement et l'avancement
- Une étape à la fois, tester avant de soumettre
- Pas de BDD — l'app est 100% read-only, toutes les données viennent de l'API Pulp
