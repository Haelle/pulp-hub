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
