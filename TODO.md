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

## Tâches et Workers

Page `/tasks` listant les tâches async Pulp (sync, publish, delete, etc.) et l'état des workers.

**Tâches — contenu :**

- Liste paginée avec filtres : état (`waiting`, `running`, `completed`, `failed`, `canceled`), nom
- Colonnes : nom, état (badge couleur), worker, date de début/fin, durée
- Détail d'une tâche : progress reports, error message, resources créées/affectées, parent/child tasks
- Lien vers la ressource créée quand c'est une distribution/publication

**API Tâches :**

- `GET /pulp/api/v3/tasks/?limit=20&offset=0&ordering=-pulp_created` — liste paginée
- `GET /pulp/api/v3/tasks/?state=failed` — filtre par état
- `GET /pulp/api/v3/tasks/{task_href}/` — détail (progress_reports, error, created_resources)
- Swagger : https://pulpproject.org/pulpcore/restapi/ (section Task)

**Workers — contenu :**

- Liste des workers avec heartbeat et tâche en cours
- Badge online/offline basé sur `last_heartbeat` (considérer offline si > 60s)

**API Workers :**

- `GET /pulp/api/v3/workers/` — liste complète
- Champs utiles : `name`, `last_heartbeat`, `current_task`

**Task Schedules (optionnel) :**

- `GET /pulp/api/v3/task-schedules/` — tâches planifiées (dispatch_interval, next_dispatch)

**CLI :** `pulp task list`, `pulp task show --href <href>`, `pulp worker list`

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

## Infra — Déploiement prod

- configurer Pulp CIISO en pull-through et mettre à jour les dépôts pour pointer dessus

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

## Docker — PULP_URL injectée au runtime

Actuellement l'utilisateur saisit l'URL Pulp dans le formulaire de login. On veut que l'URL soit une variable d'environnement du container (`PULP_URL`, obligatoire), injectée au runtime via `sed` dans les fichiers buildés. Plus besoin de saisir l'URL au login.

### Approche

1. Le code source utilise une constante `__PULP_URL__` (comme `__APP_VERSION__`)
2. Vite `define` remplace par `'_PULP_URL_'` (placeholder littéral) au build
3. En dev, Vite `define` remplace par `''` (string vide = URLs relatives via proxy Vite)
4. Au démarrage du container, un entrypoint `sed` remplace `_PULP_URL_` par la vraie URL

### Fichiers à modifier

#### 1. `vite.config.ts` — define `__PULP_URL__`

```ts
define: {
  __APP_VERSION__: JSON.stringify(getVersion()),
  __PULP_URL__: JSON.stringify(process.env.PULP_URL ?? '_PULP_URL_')
}
```
- En dev (`npm run dev`) : `PULP_URL` non défini → placeholder `_PULP_URL_`, mais le proxy Vite rend ça transparent
- En build (`npm run build`) : idem, le placeholder se retrouve dans le JS bundlé
- Si `PULP_URL` est défini (tests, builds spéciaux) : valeur directe

Ajouter aussi le proxy Vite pour le dev :
```ts
server: {
  proxy: {
    '/pulp/': { target: 'http://localhost:8081', changeOrigin: true },
    '/auth/': { target: 'http://localhost:8081', changeOrigin: true }
  }
}
```

#### 2. `src/app.d.ts` — déclarer le global

```ts
const __PULP_URL__: string;
```

#### 3. `src/lib/auth.svelte.ts` — utiliser `__PULP_URL__`

- `pulpUrl` n'est plus un input user, c'est une constante : `const PULP_URL = __PULP_URL__`
- Supprimer `pulpUrl` du `$state` et de `AuthState` (plus besoin de le stocker en sessionStorage)
- `login()` ne prend plus `url` en paramètre, juste `(user, pass)`
- Garder `auth.pulpUrl` en getter qui retourne la constante
- `AuthState` simplifié : `{ username, authMode }`

#### 4. `src/routes/+page.svelte` — supprimer le champ URL

- Supprimer le champ `input[name="url"]`
- Appeler `auth.login(username, password)` sans URL
- Afficher l'URL Pulp configurée quelque part (petit texte sous le titre ?)

#### 5. `src/lib/components/Navbar.svelte`

- `auth.pulpUrl` affiche maintenant la constante — OK, rien à changer

#### 6. `Dockerfile` — entrypoint + copie

```dockerfile
FROM docker.io/library/nginx:alpine

COPY nginx/pulphub.conf /etc/nginx/nginx.conf
COPY build /var/www.orig
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

#### 7. `docker-entrypoint.sh` — nouveau fichier

```bash
#!/bin/sh
set -e

if [ -z "$PULP_URL" ]; then
  echo "\033[31mERROR: PULP_URL is required\033[0m" >&2
  exit 1
fi

# Remove trailing slash
PULP_URL="${PULP_URL%/}"

rm -rf /var/www
cp -r /var/www.orig /var/www

# Replace placeholder in built JS files
find /var/www -name '*.js' -exec sed -i "s|_PULP_URL_|${PULP_URL}|g" {} +

exec "$@"
```

#### 8. `docker-compose.yml` et `docker-compose.demo.yml`

Ajouter `PULP_URL` au service pulphub :
```yaml
pulphub:
  image: docker.io/estb/pulp-hub:latest
  ports: ['8080:80']
  environment:
    PULP_URL: http://localhost:8081
```

#### 9. Tests e2e

- `e2e/helpers/login.ts` : supprimer la saisie du champ URL
- `e2e/auth.test.ts` : adapter (plus de champ URL)
- `e2e/session-auth.test.ts` : adapter
- `e2e/navbar.test.ts` : adapter le test du badge (URL affichée = `_PULP_URL_` ou la valeur talkback)
- Les tests utilisent talkback (port 8787). Le `__PULP_URL__` en dev/test pointe vers talkback via env ou le define Vite.

Pour les tests : `PULP_URL` sera défini dans `vite.config.ts` define comme `process.env.PULP_URL ?? '_PULP_URL_'`. Le playwright.config.ts peut setter `PULP_URL` à `http://localhost:8787` pour que le build de test utilise talkback.

#### 10. `src/lib/pulp.ts`

Toutes les fonctions utilisent déjà `${auth.pulpUrl}/pulp/api/v3/...`. Comme `auth.pulpUrl` retourne la constante, rien à changer dans ce fichier.

### Vérification

1. `make test` — tous les tests passent
2. Build local : `npm run build` → vérifier que `_PULP_URL_` est dans les .js
3. Docker : `docker build -t pulphub-test .` puis `docker run -e PULP_URL=http://localhost:8081 pulphub-test` → vérifier que sed remplace correctement
4. Docker sans PULP_URL : doit planter avec un message d'erreur clair
