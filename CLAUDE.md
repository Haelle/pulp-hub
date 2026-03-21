# PulpHub — Instructions Claude Code

## Projet

UI de visualisation de dépôts d'images container Pulp, inspirée de Docker Hub.
Stack : SvelteKit (Svelte 5 runes) + shadcn-svelte + Tailwind CSS v4 + adapter-node.

## Développement

- utiliser `make` autant que possible, s'il manque des opérations les ajouter
- ne pas tenter de lancer le serveur ou des tests en dehors du devcontainer
- Le dev se fait dans un devcontainer (Docker) — toutes les commandes passent par `make`
- `make dev` lance le serveur de dev
- `make recreate` est nécessaire après modification de `devcontainer.json` ou du `Dockerfile`
- `forwardPorts` dans `devcontainer.json` ne fonctionne qu'avec VS Code — utiliser `-p` dans `runArgs` pour la CLI
- ne pas utiliser de `SCRIPT_DIR` dans les fichiers bash
- Utilise la TDD quand c'est possible

## Pulp

- Instance Pulp de dev sur l'hôte via `make start-pulp`, exposée en `http://localhost:8081`
- Le devcontainer y accède via `host.docker.internal` (`--add-host=host.docker.internal:host-gateway`)
- Auth : session Django (`GET /auth/login/` pour CSRF, `POST /auth/login/` avec credentials → cookie `sessionid`)
- PulpHub est une SPA statique — le navigateur fait des `fetch` directement vers l'API Pulp (CORS requis)
- Pulp doit avoir `PULP_CORS_ALLOW_ALL_ORIGINS=true` (déjà configuré dans `make start-pulp` et `docker-compose.yml`)
- `pulp-cli` : `remote create` ne supporte pas `--include-tags`, utiliser `remote update` après le create
- Les tags sont limités dans seed.sh pour éviter les 429 Docker Hub (rate limit ~100 pulls/6h sans auth)

## pulp-cli — Arbre des commandes

`pulp-cli` v0.38.2 — les commandes sont découvertes dynamiquement depuis le schéma API du serveur.
Lancer `pulp --refresh-api` si les sous-commandes ne sont pas trouvées.

```
pulp
├── config          create | edit | validate
├── status
├── show            --href (affiche n'importe quelle ressource par href)
│
├── container
│   ├── remote        create | destroy | list | show | update | label | role
│   │                   create: --name --url --upstream-name (requis) --policy [immediate|on_demand|streamed]
│   │                           --include-tags --exclude-tags --username --password
│   │                   ⚠ --include-tags n'est pas supporté au create, utiliser update après
│   ├── repository    create | list | show | sync | tag | untag | label | role | task | version
│   │                   create: --name (requis) --remote --description
│   │                   sync: --name/--href --remote
│   ├── distribution  create | destroy | list | show | update | label | role
│   │                   create: --name --base-path (requis) --repository --private/--public
│   │                   ⚠ pas de --type pull-through, le pull-through passe par l'API REST
│   ├── content       list | show | label  (--type [blob|manifest|tag])
│   └── namespace     create | destroy | list | show | role
│
├── file
│   ├── remote        create | destroy | list | show | update | label | role
│   │                   create: --name --url (requis) --policy [immediate|on_demand|streamed]
│   ├── repository    create | destroy | list | show | sync | update | content | label | role | task | version
│   │                   create: --name (requis) --remote --autopublish/--no-autopublish
│   │                   sync: --name/--href --remote --mirror/--no-mirror
│   ├── distribution  create | destroy | list | show | update | label | role
│   │                   create: --name --base-path (requis) --repository --publication
│   ├── content       create | list | show | upload | label
│   │                   upload: --relative-path --file (requis) --repository
│   ├── publication   create | destroy | list | show | role
│   └── acs           create | destroy | list | show | update | refresh | path | role
│
├── python
│   ├── remote        create | destroy | list | show | update | label | role
│   │                   create: --name --url (requis) --policy --includes --excludes --prereleases
│   ├── repository    create | destroy | list | show | sync | update | content | label | role | task | version
│   │                   create: --name (requis) --remote --autopublish/--no-autopublish
│   ├── distribution  create | destroy | list | show | update | label | role
│   │                   create: --name --base-path (requis) --repository --remote --allow-uploads/--block-uploads
│   ├── content       create | list | show | label  (--type [package|provenance])
│   └── publication   create | destroy | list | show | role
│
├── task              list | show | cancel | destroy | purge | summary | role | profile-artifact-urls
├── task-group        list | show
├── worker            list | show
├── user              create | destroy | list | show | update | role-assignment
├── group             create | destroy | list | show | permission | role | role-assignment | user
├── role              create | destroy | list | show | update
├── artifact          list | show | upload
├── orphan            cleanup
├── domain            create | destroy | list | show | update | role
├── content           list (générique, cross-plugin)
├── distribution      list (générique, cross-plugin)
├── publication       list (générique, cross-plugin)
├── remote            list (générique, cross-plugin)
├── repository        list | reclaim | version (générique, cross-plugin)
├── content-guard     list | composite | header | rbac | redirect | rhsm | x509
├── access-policy
├── signing-service   list | show
├── upload            destroy | list | show
├── export            pulp
├── exporter          pulp
├── importer          pulp
├── upstream-pulp     create | destroy | list | show | update | replicate
├── debug
└── vulnerability-report
```

### Patterns récurrents

- Toutes les ressources supportent `--name` pour identifier et `--href` pour référencer par URL
- Référencement cross-plugin : `--remote "container:container:mon-remote"` ou `--repository "file:file:mon-repo"`
- `--format json` sur toutes les commandes pour parser la sortie
- `--labels` accepte du JSON ou `@fichier.json`
- Les `sync`, `create`, `destroy` sont des tâches async (attendre avec `-T 0` pour infini)

### Pull-through (non supporté par pulp-cli)

Le pull-through cache utilise des endpoints API REST dédiés que pulp-cli ne couvre pas :
- `POST /pulp/api/v3/remotes/container/pull-through/`
- `POST /pulp/api/v3/distributions/container/pull-through/`
- Pour Python/npm : distributions standard avec un `remote` attaché

→ voir `bin/setup-pullthrough.sh` qui utilise curl directement

## Conventions

- Voir PLAN.md pour le plan de développement et l'avancement
- Une étape à la fois, tester avant de soumettre
- Pas de BDD — l'app est 100% read-only, toutes les données viennent de l'API Pulp
- sur TOUTES les pages indiquer la commande Pulp CLI qui permet d'obtenir le même résultat quand elle est disponible et qu'elle est unique (par exemple la liste des tags il faut combiner des requêtes), dans le cas où il faut combiner des requêtes ne pas détailler les requête mais expliquer la logique, prévoir un encart juste sous la navbar je pense qu'un composant alert me semble approprié
