# PulpHub — Plan de développement

UI de visualisation des dépôts d'images container Pulp.
Inspirée de Docker Hub. Stack : **SvelteKit + shadcn-svelte uniquement** — pas de backend intermédiaire, appels directs vers l'API Pulp via les server routes SvelteKit.

---

## Architecture

```text
Navigateur
    │  Pas d'appel API direct (session jamais exposée côté client)
    ▼
SvelteKit server routes (+page.server.ts / +server.ts)
    │  Cookie: sessionid=<pulp_session>  (cookie httpOnly de session Django)
    ▼
Pulp API (/pulp/api/v3/  +  /auth/login/)
```

**Flux d'authentification :**

1. L'utilisateur saisit `URL Pulp` + `username` + `password` sur la page login.
2. La server route SvelteKit fait un `GET /auth/login/` pour obtenir le CSRF token.
3. Puis un `POST /auth/login/` avec CSRF + credentials.
4. Pulp retourne un cookie `sessionid` (valide 2 semaines).
5. Le `sessionid` est stocké dans un **cookie httpOnly PulpHub** — jamais exposé au JavaScript client.
6. Chaque appel suivant depuis les server routes injecte `Cookie: sessionid=<session>`.

**TLS :** Pulp utilise un certificat auto-signé. Le dev server est lancé avec `NODE_TLS_REJECT_UNAUTHORIZED=0`.

---

## Structure du dépôt

```text
pulphub/
├── .devcontainer/
│   ├── Dockerfile            # Node 24 + pipx + pulp-cli + neovim
│   └── devcontainer.json     # --add-host=pulp.local:host-gateway
├── bin/
│   ├── setup.sh              # Configure pulp-cli (interactif)
│   ├── seed.sh               # Peuple Pulp avec des données de test
│   └── clean.sh              # Supprime les données de test
├── src/
│   ├── lib/
│   │   ├── pulp.ts           # pulpLogin() + pulpFetch() (server-side)
│   │   ├── utils.ts          # cn() + types shadcn-svelte
│   │   └── components/
│   │       └── ui/           # shadcn-svelte (à venir)
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte          # Login (URL + username + password)
│   │   ├── +page.server.ts       # pulpLogin() → cookies → redirect /status
│   │   └── status/
│   │       ├── +page.svelte      # Affiche le JSON brut de pulp status
│   │       └── +page.server.ts   # pulpFetch() → /pulp/api/v3/status/
│   └── app.css               # Dark theme + Tailwind v4
├── Makefile                   # up/down/recreate/setup/dev/seed/clean/shell
├── PLAN.md
└── README.md
```

---

## Règles du processus

- **Une étape à la fois.** Aucun travail sur l'étape N+1 avant la revue de code de l'étape N.
- **Revue de code entre chaque étape.**
- **L'IA teste elle-même avant soumission.** Appels API vérifiés, rendu des pages vérifié.
- **Pas de BDD.** L'application est 100% read-only. Toutes les données viennent directement de l'API Pulp.

---

## Étape 0 — Environnement de test ✅

### Réalisé

- `bin/seed.sh` : idempotent, crée 3 remotes + repos + distributions + sync via `pulp-cli`
  - `remote create` sans `--include-tags` (bug CLI corrigé), puis `remote update` pour filtrer les tags
  - Tags limités (alpine: 3.18/3.19/latest, busybox: 1.36/latest, hello-world: latest) pour éviter les 429 Docker Hub
- `bin/clean.sh` : supprime les données de test (distributions → repos → remotes)
- `bin/setup.sh` : configure `pulp config create` interactivement (URL, login, mdp)
- `Makefile` : `make setup`, `make seed`, `make clean`

---

## Étape 1 — Squelette SvelteKit + configuration ✅

### Réalisé

- SvelteKit avec `adapter-node`, Svelte 5 mode runes
- shadcn-svelte initialisé (`utils.ts`, `tailwind-variants`, `tw-animate-css`)
- Dark theme : fond `#0f1117`, surface `#1a1d27`, accent `#e8ff41`
- Polices : Geist (texte) + JetBrains Mono (monospace)
- Tailwind CSS v4 via `@tailwindcss/vite`
- Devcontainer : Node 24 + pulp-cli + `--add-host=pulp.local:host-gateway`
- `Makefile` complet : `up`/`down`/`recreate`/`dev`/`build`/`check`/`shell`
- Fichiers remontés de `ui/` à la racine du projet

---

## Étape 2 — Authentification (login / cookie httpOnly) ✅

### Réalisé

- Page login sur `/` : formulaire URL + username + password
- `src/lib/pulp.ts` :
  - `pulpLogin(url, username, password)` : flow CSRF → session Django (`GET /auth/login/` → `POST /auth/login/`)
  - `pulpFetch(url, sessionid)` : fetch avec cookie `sessionid`
- `+page.server.ts` : action login → cookies `pulp_url` + `pulp_session` → redirect `/status`
- Page `/status` : affiche le JSON brut de `/pulp/api/v3/status/`
- Gestion des erreurs : message affiché dans le formulaire (credentials invalides, Pulp injoignable)
- Trailing slash nettoyé sur l'URL saisie
- Guard global sur `+layout.server.ts` : redirect `/` si pas de session, valide la session via `/pulp/api/v3/status/`
- Route `POST /logout` : efface les cookies → redirect `/`
- `Navbar.svelte` avec URL Pulp + bouton logout (affiché uniquement si authentifié)
- Cookie `Secure` en production (détecté via `url.protocol`)
- Gestion de l'expiration de session : le layout vérifie la session à chaque navigation, redirige vers login si expirée

---

## Étape 3 — Page liste des repositories

### Objectif

Afficher la liste paginée des distributions container Pulp sous forme de grille de cartes.

### Contenu

- Appel : `GET /pulp/api/v3/distributions/container/container/?limit=20&offset=0`
- `RepoCard.svelte` : nom, `base_path`, `registry_path`, lien vers détail
- Pagination shadcn, 20 items/page, `offset` en query param URL
- Filtre client-side sur `name` et `base_path`
- Skeleton loader + état vide

---

## Étape 4 — Page détail d'un repository et ses tags

### Objectif

Afficher le détail d'une distribution et la liste de ses tags avec digest et date.

### Contenu

- Appels : distribution par nom → `latest_version_href` → tags
- `TagRow.svelte` : nom tag, digest tronqué + tooltip, date
- `PullCommand.svelte` : commande pull + bouton copie clipboard
- 404 si repo inexistant

---

## Étape 5 — Page détail d'un tag (manifest + layers)

### Objectif

Afficher le manifest complet d'un tag : architecture, OS, liste des layers avec taille.

### Contenu

- Appels : tag → manifest → config blob (arch, OS)
- `LayerList.svelte` : digest tronqué, taille human-readable, media_type
- Taille totale, badges architecture + OS
- Support manifests multi-arch sans crash

---

## Étape 6 — Recherche globale, polish et responsive

### Objectif

Finaliser l'application : recherche cross-repos, responsive mobile, polish visuel.

### Contenu

- `SearchBar.svelte` dans la Navbar avec filtre `name__icontains` (API Pulp)
- Debounce 300ms, dropdown de résultats
- Skeleton loaders sur toutes les pages
- Responsive : grille adaptative, colonnes masquées sur mobile, menu hamburger
- Transitions de page

---

## Récapitulatif

| #   | Étape               | Statut    | Livrable principal                 |
| --- | ------------------- | --------- | ---------------------------------- |
| 0   | Script seed         | ✅ fait    | `seed.sh` idempotent               |
| 1   | Squelette SvelteKit | ✅ fait    | Projet + dark theme + devcontainer |
| 2   | Auth login/cookie   | ✅ fait     | Login → session Django → redirect  |
| 3   | Liste repositories  | ⬜ à faire | Grille de RepoCard paginée         |
| 4   | Détail repo + tags  | ⬜ à faire | Tableau des tags + pull command    |
| 5   | Détail tag + layers | ⬜ à faire | Manifest + layers + tailles        |
| 6   | Recherche + polish  | ⬜ à faire | App complète et responsive         |
