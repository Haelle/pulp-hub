# TODO

## PulpHub

- afficher les content guards et rôles dans PulpHub ?

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
