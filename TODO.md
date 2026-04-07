# TODO

## PulpHub

- afficher les content guards et rôles dans PulpHub ?

## Dashboard

Page d'accueil `/dashboard` avec vue d'ensemble de l'instance Pulp.

**Contenu envisagé :**

- Compteurs : distributions (container, file, npm, python), pull-through caches, utilisateurs
- État de l'instance (version Pulp, plugins installés — déjà dispo via `GET /pulp/api/v3/status/`)
- Raccourcis vers les sections principales
- Éventuellement : tâches récentes en erreur (cf. section Tâches ci-dessous)

**API :**

- `GET /pulp/api/v3/status/` — version et plugins (déjà utilisé dans `/status`)
- `GET /pulp/api/v3/distributions/container/container/?limit=0` — `count` uniquement
- `GET /pulp/api/v3/distributions/file/file/?limit=0` — idem
- `GET /pulp/api/v3/distributions/npm/npm/?limit=0` — idem
- `GET /pulp/api/v3/distributions/python/pypi/?limit=0` — idem
- `GET /pulp/api/v3/distributions/container/pull-through/?limit=0` — idem
- `GET /pulp/api/v3/users/?limit=0` — idem
- `GET /pulp/api/v3/tasks/?state=failed&ordering=-finished_at&limit=5` — dernières tâches en erreur

Astuce : `?limit=0` retourne `count` sans charger les résultats → requêtes très légères, parallélisables.

**CLI :** `pulp status`

## Suppression d'images / dépôts

Ajouter des actions de suppression (avec confirmation modale) sur les pages existantes.
PulpHub reste orienté lecture, mais la suppression est une opération de maintenance courante.

**Attention :** les suppressions sont des tâches async dans Pulp — afficher le statut de la tâche après déclenchement (lien vers la vue tâches).

### Suppression d'une distribution container (+ remote + repository)

Supprimer une distribution container implique généralement de nettoyer les 3 ressources liées.
L'ordre est important : distribution → repository → remote (sinon Pulp refuse si des dépendances existent).

**API :**

1. `DELETE /pulp/api/v3/distributions/container/container/{pulp_id}/` — supprime la distribution
2. `DELETE /pulp/api/v3/repositories/container/container/{pulp_id}/` — supprime le repository
3. `DELETE /pulp/api/v3/remotes/container/container/{pulp_id}/` — supprime le remote

Chaque DELETE retourne une tâche async : `{ "task": "/pulp/api/v3/tasks/{uuid}/" }`.
Il faut attendre la fin de chaque tâche avant de passer à la suivante (poll sur `GET /pulp/api/v3/tasks/{uuid}/` jusqu'à `state == "completed"`).

**UX :** modale de confirmation avec le nom de la distribution, checkboxes optionnelles "supprimer aussi le repository" et "supprimer aussi le remote". Afficher le résultat (succès/erreur + lien tâche).

**CLI :** `pulp container distribution destroy --name <name>`, `pulp container repository destroy --name <name>`, `pulp container remote destroy --name <name>`

### Suppression d'une distribution file / npm / python

Même pattern :

- `DELETE /pulp/api/v3/distributions/file/file/{id}/`
- `DELETE /pulp/api/v3/distributions/npm/npm/{id}/`
- `DELETE /pulp/api/v3/distributions/python/pypi/{id}/`

### Suppression d'un pull-through cache

- `DELETE /pulp/api/v3/distributions/container/pull-through/{id}/`
- `DELETE /pulp/api/v3/remotes/container/pull-through/{id}/`

### Nettoyage des orphelins

Après suppression, proposer un lien vers le nettoyage des orphelins (artifacts non référencés) :

- `POST /pulp/api/v3/orphans/cleanup/` avec body `{ "orphan_protection_time": 0 }`
- **CLI :** `pulp orphan cleanup`

### Implémentation

- Étendre `pulpFetch` pour supporter les méthodes `DELETE` et `POST` (actuellement GET only)
- Ajouter un helper `pulpDelete(href)` et un `pulpPost(href, body)`
- Composant `DeleteConfirmModal.svelte` réutilisable (nom de la ressource, checkboxes optionnelles, état de la tâche)
- Composant `TaskStatus.svelte` pour afficher le polling d'une tâche en cours

## Gestion des droits — CRUD Users et RBAC

### CRUD Utilisateurs

Étendre la page `/users` existante (actuellement lecture seule) avec création, modification et suppression.

**API :**

- `GET /pulp/api/v3/users/?limit=20&offset=0` — liste (déjà implémenté)
- `POST /pulp/api/v3/users/` — créer un utilisateur
  Body : `{ "username", "password", "email", "first_name", "last_name", "is_staff", "is_active" }`
- `PATCH /pulp/api/v3/users/{id}/` — modifier (mêmes champs, tous optionnels)
- `DELETE /pulp/api/v3/users/{id}/` — supprimer

**CLI :** `pulp user create --username <u> --password <p>`, `pulp user update --username <u> --email <e>`, `pulp user destroy --username <u>`

### Groupes

- `GET /pulp/api/v3/groups/` — liste
- `POST /pulp/api/v3/groups/` — créer (`{ "name" }`)
- `PATCH /pulp/api/v3/groups/{id}/` — modifier
- `DELETE /pulp/api/v3/groups/{id}/` — supprimer
- `POST /pulp/api/v3/groups/{id}/users/` — ajouter un utilisateur au groupe (`{ "username" }`)
- `DELETE /pulp/api/v3/groups/{id}/users/{user_id}/` — retirer un utilisateur

**CLI :** `pulp group create --name <g>`, `pulp group user add --group <g> --username <u>`

### Rôles (RBAC)

Pulp utilise un système RBAC basé sur des rôles. Chaque rôle contient un ensemble de permissions.

**API Rôles :**

- `GET /pulp/api/v3/roles/?limit=100` — liste des rôles (avec `locked` = rôle système non modifiable)
- `POST /pulp/api/v3/roles/` — créer (`{ "name", "permissions": ["core.view_task", ...] }`)
- `PATCH /pulp/api/v3/roles/{id}/` — modifier
- `DELETE /pulp/api/v3/roles/{id}/` — supprimer (impossible si `locked`)

**Assignation de rôles :**

- Chaque objet Pulp (distribution, repository, remote, namespace) a des endpoints d'assignation :
  - `POST {object_href}add_role/` — body : `{ "role": "container.containerrepository_owner", "users": ["admin"], "groups": [] }`
  - `POST {object_href}remove_role/` — même format
  - `GET {object_href}list_roles/` — rôles assignés sur cet objet
  - `GET {object_href}my_permissions/` — permissions de l'utilisateur courant

**Swagger :** https://pulpproject.org/pulpcore/restapi/ (sections Role, User, Group)

**CLI :** `pulp role list`, `pulp role create --name <r> --permission core.view_task`

### Pages envisagées

- `/users` — étendre la page existante avec boutons créer/modifier/supprimer
- `/groups` — nouvelle page avec liste, CRUD, gestion des membres
- `/roles` — nouvelle page avec liste des rôles, permissions, indicateur locked

### Implémentation

- Étendre `pulpFetch` avec support POST/PATCH/DELETE (comme pour la section suppression)
- Formulaires avec validation côté client (username unique, password requis à la création)
- Les rôles `locked` sont en lecture seule (pas de bouton modifier/supprimer)

## Auth — Docker (OCI) — TOKEN_SERVER

Actuellement `TOKEN_AUTH_DISABLED=true` = registry ouvert, pas de `podman login` (dev only).
Ne concerne **que** le protocole Docker Registry v2 (pas npm, PyPI, file).

En prod :

- `TOKEN_SERVER` + `TOKEN_SIGNATURE_ALGORITHM` (ES256/RS256) + `TOKEN_AUTH_KEY` (clé privée)
- Flow : `podman login` → credentials Django → `/token/` → JWT signé → pull/push
- Le `TOKEN_SERVER` doit être l'URL publique vue par le client

```bash
# Config Pulp (env vars du container)
PULP_TOKEN_SERVER=http://pulp.example.com/token/
PULP_TOKEN_SIGNATURE_ALGORITHM=ES256
PULP_TOKEN_AUTH_KEY=/etc/pulp/token_private_key.pem

# Générer les clés
openssl ecparam -genkey -name prime256v1 -noout -out token_private_key.pem
openssl ec -in token_private_key.pem -pubout -out token_public_key.pem

# Côté client
podman login pulp.example.com -u jean-docker -p Pulp1234!
podman pull pulp.example.com/dockerhub-cache/library/alpine:latest
```

## Auth — Fichiers / npm / PyPI — RBAC content guard

Le content app (`/pulp/content/`) sert tout sans auth par défaut.
Pour restreindre : attacher un **content guard RBAC** sur la distribution.
L'utilisateur doit passer **Basic Auth** pour télécharger.

```bash
# 1. Créer le guard
pulp content-guard rbac create --name my-guard

# 2. Attacher à une distribution
pulp file distribution update --name test-docs --content-guard "core:core:my-guard"
# Pour npm/pypi (pas de support pulp-cli, utiliser curl) :
curl -u admin:admin -X PATCH "$PULP_URL$DIST_HREF" \
  -H "Content-Type: application/json" -d '{"content_guard":"'$GUARD_HREF'"}'

# 3. Donner accès à un utilisateur
pulp content-guard rbac assign --name my-guard \
  --user jean-docker --role core.rbaccontentguard_downloader

# 4. Côté client
# File
curl -u jean-docker:Pulp1234! http://pulp.example.com/pulp/content/test-docs/README.md

# PyPI
uv pip install --index-url http://jean-docker:Pulp1234!@pulp.example.com/pypi/pypi-cache/simple/ requests

# npm
npm install --registry=http://jean-docker:Pulp1234!@pulp.example.com/pulp/content/npmjs-cache/ is-odd
```

### Gestion des credentials côté client

Ne pas versionner les credentials dans `pyproject.toml` / `.npmrc` / `.yarnrc.yml`.

- **~/.netrc** — pip, uv, curl le lisent automatiquement :
  ```
  machine pulp.example.com
  login jean-docker
  password Pulp1234!
  ```
- **uv** — env vars : `UV_INDEX_PYPI_CACHE_USERNAME` / `UV_INDEX_PYPI_CACHE_PASSWORD`
- **npm** — `npm login --registry=http://pulp.example.com/pulp/content/npmjs-cache/` (stocke le token dans `~/.npmrc` utilisateur)
- **pip** — keyring système (`pip install keyring`)

## Tests E2E — Module Tasks

### Contexte

Le module Tasks (`/tasks` et `/tasks/[id]`) n'a aucun test e2e. Toutes les autres pages (images, files, npm, python, pull-through, users) sont testées. La page Tasks est particulière : elle utilise un `<table>` au lieu de cards, a des filtres par état, un onglet Workers, et une page de détail riche (timing, erreurs, progress reports, resources liées).

### Fichier à créer

`e2e/tasks.test.ts`

### Approche

Réutiliser les helpers partagés (`testListPage`, `testDetailPage`) avec `itemSelector: 'tbody tr'` pour s'adapter au format table, puis ajouter des tests spécifiques pour les fonctionnalités propres aux Tasks.

### Structure des tests

#### 1. Tasks list page (`test.describe`)

- **Shared tests via `testListPage`** (6 tests) :
  - `route: '/tasks'`, `title: 'Tasks & Workers'`
  - `itemSelector: 'tbody tr'` (table rows, pas cards)
  - `filterText: 'repository'` (fragment courant dans les noms de tasks Pulp)
  - `hasCliHint: true`
- **State filter buttons visible** — vérifie All/running/waiting/completed/failed/canceled
- **State filter updates table** — clic sur "completed", vérifie que tous les badges affichent "completed"
- **Task row structure** — 5 colonnes (Name, State, Worker, Started, Duration), lien sur le nom, badge sur state
- **Click task → navigates to detail**

#### 2. Workers tab (`test.describe`)

- **Workers tab shows table** — clic sur bouton "Workers", table visible
- **Worker row structure** — nom + badge status (Online/Offline)
- **CLI hint** — `pulp worker list`

#### 3. Task detail page (`test.describe`)

- **Shared tests via `testDetailPage`** (4 tests) :
  - `listRoute: '/tasks'`, `itemSelector: 'tbody tr a'` (lien dans la row)
  - `directRoute: '/tasks/<TASK_UUID>'` (à remplacer après enregistrement)
  - `notFoundRoute: '/tasks/00000000-0000-0000-0000-000000000000'`
- **State badge visible**
- **Timing card** — Created/Started/Finished/Duration visibles
- **CLI hint content** — contient `pulp task show`
- **Back to tasks link** visible

### Processus d'implémentation

1. **Créer `e2e/tasks.test.ts`** avec les placeholders `<TASK_UUID>`
2. **Premier run** : `make test FILE=e2e/tasks.test.ts` — enregistre les tapes via talkback (nécessite Pulp live avec `make start-pulp`)
3. **Extraire un UUID** depuis les tapes enregistrées dans `e2e/tapes/GET_pulp_api_v3_tasks_*`
4. **Remplacer `<TASK_UUID>`** dans le fichier de test
5. **Re-run** : `make test FILE=e2e/tasks.test.ts` — tout passe en mode replay

### Points d'attention

- **Debounce 300ms** sur le filtre nom : Playwright auto-wait devrait suffire
- **Workers heartbeat** : en replay les workers seront "Offline" (dates figées) — on teste juste la présence du badge, pas le status exact
- **`itemSelector: 'tbody tr a'`** pour `testDetailPage` : le `.first().click()` doit cliquer sur le lien `<a>`, pas la row entière (seul le nom est cliquable)
- **`filterText: 'repository'`** : à ajuster si les tapes ne contiennent pas de tâches avec ce fragment

### Fichiers référencés

- `e2e/helpers/shared-list-tests.ts` — `testListPage()`, `testDetailPage()`
- `e2e/helpers/login.ts` — `login(page)`
- `src/routes/tasks/+page.svelte` — page liste
- `src/routes/tasks/[id]/+page.svelte` — page détail
- `src/lib/pulp.ts:628-653` — `getTasks()`, `getTask()`, `getWorkers()`

### Vérification

```bash
make test FILE=e2e/tasks.test.ts
```

Tous les tests doivent passer (~17 tests au total).

## Auth — Source d'utilisateurs externe

### LDAP / Active Directory

`pip install django-auth-ldap` dans le container Pulp + config `AUTH_LDAP_*` dans settings.

### OIDC / Keycloak (recommandé)

Reverse proxy (oauth2-proxy ou mod_auth_openidc) devant Pulp qui injecte le header `REMOTE_USER`.
Supporté nativement par Pulp — pas de modification de l'image.

```python
AUTHENTICATION_BACKENDS = ["pulpcore.app.authentication.PulpNoCreateRemoteUserBackend"]
REST_FRAMEWORK__DEFAULT_AUTHENTICATION_CLASSES = [
    "rest_framework.authentication.SessionAuthentication",
    "pulpcore.app.authentication.PulpRemoteUserAuthentication",
]
REMOTE_USER_ENVIRON_NAME = "HTTP_REMOTE_USER"
```

- `PulpNoCreateRemoteUserBackend` = l'utilisateur doit exister dans Pulp
- `RemoteUserBackend` (Django standard) = auto-création à la première connexion

## Docker — PULP_URL injectée au runtime (pattern `config.js`)

### Contexte

Aujourd'hui l'utilisateur doit saisir l'URL Pulp dans le formulaire de login (`src/routes/+page.svelte:59`), elle est ensuite stockée en `sessionStorage` (`src/lib/auth.svelte.ts:99`). On veut que l'URL soit fixée par une variable d'environnement `PULP_URL` du conteneur, **modifiable sans rebuild** : `docker stop` → changer `PULP_URL` → `docker start` doit suffire pour pointer vers une autre instance Pulp.

Le plan initial proposait un `sed` sur les `.js` bundlés avec une copie `/var/www.orig` → `/var/www` à chaque démarrage. C'est un hack — on touche à des fichiers hashés, on doit scanner tous les bundles, et la copie `.orig` est inutilement contournée. On part sur le pattern standard SPA : un fichier **`config.js` séparé** chargé par `index.html` et **généré par `envsubst` dans l'entrypoint** à chaque démarrage du conteneur. Les bundles JS hashés ne sont jamais touchés.

### Approche

1. `index.html` charge `<script src="/config.js">` qui définit `window.__PULPHUB__ = { PULP_URL: "..." }`.
2. **En prod** : l'entrypoint nginx lance `envsubst` sur un template avant `nginx`, à **chaque démarrage** → modification de `PULP_URL` + restart = nouvelle URL, sans rebuild.
3. **En dev (Vite)** : un petit plugin Vite sert dynamiquement `/config.js` depuis `process.env.PULP_URL` (relu à chaque requête). Pas de fichier `static/config.js` versionné — il serait gênant en prod (priorité statique sur le template).
4. **En e2e** : Playwright passe `PULP_URL=http://localhost:8787` au `webServer` Vite ; le plugin sert ce que talkback attend.
5. `auth.svelte.ts` lit `window.__PULPHUB__.PULP_URL` une seule fois à l'initialisation et l'expose comme constante via le getter `auth.pulpUrl` existant.
6. La page de login perd son champ URL et affiche à la place « Connexion à `<URL>` ». La navbar (`Navbar.svelte:96`) reste inchangée.

### Modifications

#### 1. `src/lib/config.ts` — nouveau fichier

```ts
declare global {
	interface Window {
		__PULPHUB__?: { PULP_URL?: string };
	}
}

function readPulpUrl(): string {
	if (typeof window === 'undefined') return '';
	const raw = window.__PULPHUB__?.PULP_URL ?? '';
	return raw.replace(/\/+$/, '');
}

export const PULP_URL = readPulpUrl();
```

Lecture une seule fois au chargement du module. Trim du trailing slash centralisé ici (au lieu de `auth.svelte.ts:128`).

#### 2. `src/app.html` — injection du script

Avant `%sveltekit.head%` (ligne 15), ajouter :

```html
<script src="%sveltekit.assets%/config.js"></script>
```

Le script doit charger **avant** les bundles SvelteKit pour que `window.__PULPHUB__` soit défini quand `auth.svelte.ts` est évalué.

#### 3. `vite.config.ts` — plugin servant `/config.js` en dev

Ajouter un plugin local avant `sveltekit()` :

```ts
function pulpUrlConfigPlugin() {
	return {
		name: 'pulphub-config',
		configureServer(server) {
			server.middlewares.use('/config.js', (_req, res) => {
				const url = process.env.PULP_URL ?? '';
				res.setHeader('Content-Type', 'application/javascript');
				res.setHeader('Cache-Control', 'no-store');
				res.end(`window.__PULPHUB__ = { PULP_URL: ${JSON.stringify(url)} };\n`);
			});
		}
	};
}
```

Ajouter `pulpUrlConfigPlugin()` aux `plugins`. **Ne rien mettre dans `static/`** — sinon adapter-static copierait un `config.js` versionné dans `build/`, qui prendrait la priorité sur celui généré par envsubst en prod.

#### 4. `src/lib/auth.svelte.ts` — supprimer `pulpUrl` du state

- Importer `PULP_URL` depuis `$lib/config`.
- Supprimer `pulpUrl` du `$state` (ligne 99) et du type `AuthState` (ligne 7).
- `AuthState` devient `{ username: string; password: string; authMode: AuthMode }` (on garde `password` pour Basic Auth qui reste cross-origin sans cookie).
- Le getter `auth.pulpUrl` (ligne 106) retourne directement `PULP_URL`.
- `login()` — supprimer le paramètre `url`. Nouvelle signature : `login(user: string, pass: string, options?: { forceBasicAuth?: boolean })`. Utiliser `PULP_URL` partout en interne (lignes 128-180).
- `logout()` (ligne 183) — utiliser `PULP_URL` au lieu de `pulpUrl` local.
- Migration sessionStorage : si l'ancien blob contenait `pulpUrl`, l'ignorer (le nouveau format est plus petit, pas de back-compat nécessaire vu le statut R&D du projet).

#### 5. `src/routes/+page.svelte` — virer le champ URL, afficher l'URL

- Supprimer l'`<Input id="url" name="url">` (ligne 59).
- Sous le titre du formulaire, ajouter un texte type `<p class="text-sm text-muted-foreground">Connexion à <code>{auth.pulpUrl}</code></p>` (ou `PULP_URL` importé directement).
- Mettre à jour l'appel : `auth.login(username, password, { forceBasicAuth })` (ligne 36).
- Si `auth.pulpUrl` est vide → afficher une erreur claire « `PULP_URL` non configurée » au lieu du formulaire (cas dev sans variable d'env, ou config.js manquant).

#### 6. `Dockerfile` — entrypoint + template

```dockerfile
FROM docker.io/library/nginx:alpine

RUN apk add --no-cache gettext  # pour envsubst

COPY nginx/pulphub.conf /etc/nginx/nginx.conf
COPY build /var/www
COPY docker/config.js.tpl /etc/pulphub/config.js.tpl
COPY docker/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

Note : `gettext` (pour `envsubst`) est ~200 KB, négligeable. Pas de copie `/var/www.orig` — le template est dans `/etc/pulphub/`, le rendu va dans `/var/www/config.js` (écrasement à chaque démarrage, idempotent).

#### 7. `docker/config.js.tpl` — nouveau fichier

```js
window.__PULPHUB__ = { PULP_URL: '${PULP_URL}' };
```

#### 8. `docker/entrypoint.sh` — nouveau fichier

```bash
#!/bin/sh
set -e

RED='\033[31m'
GREEN='\033[32m'
NC='\033[0m'

if [ -z "$PULP_URL" ]; then
  printf "${RED}ERROR: PULP_URL environment variable is required${NC}\n" >&2
  exit 1
fi

# Strip trailing slash
PULP_URL="${PULP_URL%/}"

export PULP_URL
envsubst < /etc/pulphub/config.js.tpl > /var/www/config.js

printf "${GREEN}PulpHub configured for ${PULP_URL}${NC}\n"

exec "$@"
```

À chaque `docker start` : entrypoint relancé → `config.js` régénéré → nginx sert le nouveau contenu. **Aucun rebuild nécessaire.**

#### 9. `nginx/pulphub.conf`

S'assurer que `/config.js` est servi avec `Cache-Control: no-store` (sinon le navigateur peut garder un ancien `PULP_URL` après restart). Ajouter un `location = /config.js { add_header Cache-Control "no-store"; }` avant le `try_files` global. Garder le caching agressif sur les bundles hashés `_app/immutable/`.

#### 10. `docker-compose.yml` et `docker-compose.demo.yml`

Ajouter `environment: { PULP_URL: http://host.docker.internal:8081 }` (ou l'URL appropriée) au service `pulphub`.

#### 11. `Makefile`

- `make dev` doit propager `PULP_URL` au process Vite. Soit l'utilisateur l'exporte, soit on le set par défaut dans la cible : `PULP_URL ?= http://localhost:8081` puis `PULP_URL=$(PULP_URL) npm run dev`.
- `make test` : `PULP_URL=http://localhost:8787` (talkback) doit être dans l'environnement de la cible test.

#### 12. Tests e2e

- **`e2e/helpers/login.ts:10`** — supprimer `await page.fill('input[name="url"]', PULP_URL)`. Garder le `PULP_URL` env var, mais c'est désormais le `webServer` Vite qui en a besoin (pas le test).
- **`playwright.config.ts:18-23`** — ajouter `env: { PULP_URL: 'http://localhost:8787' }` au webServer Vite (port 5173). C'est ça qui injecte la valeur dans le plugin Vite, donc dans le `/config.js` servi.
- **`e2e/auth.test.ts`** — adapter / supprimer les assertions sur le champ URL.
- **`e2e/session-auth.test.ts`** — idem.
- **`e2e/navbar.test.ts`** — adapter le test du badge URL : il doit maintenant afficher `http://localhost:8787`.
- **Login page** : ajouter un test « affiche `Connexion à http://localhost:8787` » sur `/`.

⚠ Les tapes talkback existantes ne devraient pas être impactées (les requêtes sortantes sont identiques), mais à valider via `make test` sur les fichiers concernés (cf. mémoire `feedback_test_record_incremental.md` — valider fichier par fichier en commençant par `session-auth.test.ts`).

#### 13. `src/lib/pulp.ts`

**Aucun changement.** Toutes les fonctions utilisent déjà `${auth.pulpUrl}/...` (ex : lignes 80, 90, 347, 457). Comme `auth.pulpUrl` retourne maintenant la constante `PULP_URL`, tout fonctionne sans modif.

### Fichiers critiques

| Fichier                                                              | Action                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/config.ts`                                                  | **créer**                                                     |
| `src/lib/auth.svelte.ts`                                             | modifier (supprimer `pulpUrl` du state, simplifier `login()`) |
| `src/routes/+page.svelte`                                            | modifier (supprimer champ URL, afficher URL)                  |
| `src/app.html`                                                       | modifier (ajouter `<script src="/config.js">`)                |
| `vite.config.ts`                                                     | modifier (ajouter plugin `pulpUrlConfigPlugin`)               |
| `Dockerfile`                                                         | modifier (ajouter `gettext`, entrypoint, template)            |
| `docker/entrypoint.sh`                                               | **créer**                                                     |
| `docker/config.js.tpl`                                               | **créer**                                                     |
| `nginx/pulphub.conf`                                                 | modifier (no-cache sur `/config.js`)                          |
| `docker-compose.yml`, `docker-compose.demo.yml`                      | modifier (env `PULP_URL`)                                     |
| `Makefile`                                                           | modifier (`PULP_URL` propagé à `dev` et `test`)               |
| `playwright.config.ts`                                               | modifier (`env: { PULP_URL }` sur webServer Vite)             |
| `e2e/helpers/login.ts`                                               | modifier (supprimer fill URL)                                 |
| `e2e/auth.test.ts`, `e2e/session-auth.test.ts`, `e2e/navbar.test.ts` | adapter                                                       |

### Vérification

1. **Dev local** : `make dev` (avec `PULP_URL=http://localhost:8081`) → ouvrir `http://localhost:5173` → la page login affiche « Connexion à http://localhost:8081 », pas de champ URL → login fonctionne → navbar affiche l'URL.
2. **Dev sans `PULP_URL`** : `unset PULP_URL && make dev` → la page login affiche un message d'erreur clair, pas de crash.
3. **E2E** : `make test FILE=e2e/session-auth.test.ts` doit passer en replay (sans réenregistrer). Puis `make test` complet.
4. **Build statique** : `npm run build` → vérifier que **aucun** `_PULP_URL_` ni `PULP_URL` n'apparaît en dur dans `build/_app/immutable/**/*.js` (les bundles ne contiennent plus l'URL, elle vient de `window.__PULPHUB__`). Vérifier qu'il n'y a **pas** de `build/config.js` (sinon il écraserait celui de l'entrypoint).
5. **Conteneur — démarrage normal** :
   ```
   docker build -t pulphub-test .
   docker run --rm -e PULP_URL=http://host.docker.internal:8081 -p 8080:80 pulphub-test
   curl -s http://localhost:8080/config.js
   # → window.__PULPHUB__ = { PULP_URL: "http://host.docker.internal:8081" };
   ```
6. **Conteneur — sans `PULP_URL`** : `docker run --rm pulphub-test` → doit planter avec message rouge.
7. **Le test critique — changement à chaud sans rebuild** :
   ```
   docker run -d --name pulphub -e PULP_URL=http://a.example/ -p 8080:80 pulphub-test
   curl -s http://localhost:8080/config.js  # → http://a.example
   docker stop pulphub
   docker rm pulphub
   docker run -d --name pulphub -e PULP_URL=http://b.example/ -p 8080:80 pulphub-test
   curl -s http://localhost:8080/config.js  # → http://b.example  ✓ même image, pas de rebuild
   ```
   Variante encore plus stricte (même conteneur, juste restart) : `docker run` avec `--env-file` puis `docker stop` / éditer le fichier / `docker start` — l'entrypoint relit l'env à chaque démarrage donc c'est OK aussi.
