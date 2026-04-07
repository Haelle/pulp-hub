# Tests e2e — Playwright + Talkback

Les tests e2e tournent contre une instance Pulp **enregistrée** dans des cassettes (`tapes/`) plutôt que contre Pulp en direct. Le proxy [Talkback](https://github.com/ijpiantanida/talkback) intercepte tous les appels HTTP émis par PulpHub vers l'API Pulp, les rejoue depuis le disque quand une cassette existe, et les enregistre la première fois sinon.

## Architecture

```text
┌──────────┐  fetch  ┌──────────────────┐  forward  ┌──────────┐  HTTP  ┌──────┐
│ PulpHub  │────────▶│  CORS proxy      │──────────▶│ Talkback │───────▶│ Pulp │
│ (Vite)   │         │  (port 8787)     │           │  (8788)  │        │      │
└──────────┘         │ + /auth/* mocks  │           └────┬─────┘        └──────┘
                     └──────────────────┘                │
                                                         ▼
                                                    ┌─────────┐
                                                    │ tapes/  │
                                                    │ *.json5 │
                                                    └─────────┘
```

Tout est implémenté dans `talkback-server.cjs` :

- **Port externe `8787`** : un petit `http.createServer` Node qui ajoute le CORS dynamique (`Access-Control-Allow-Origin: <origin>` + `Allow-Credentials: true`), gère les preflight `OPTIONS`, court-circuite `/auth/*` (voir plus bas) et forward le reste vers Talkback.
- **Port interne `8788`** : Talkback lui-même, qui consulte/écrit dans `tapes/`. Si aucune cassette ne matche et que Pulp réel est joignable, Talkback enregistre une nouvelle cassette automatiquement (`fallbackMode: NOT_FOUND`).

Côté tests, `PULP_URL = http://localhost:8787` (cf. `helpers/login.ts`), donc PulpHub croit parler à un Pulp normal.

## Mock des routes `/auth/*`

Le proxy intercepte `GET /auth/login/`, `POST /auth/login/` et `POST /auth/logout/` **avant** Talkback et renvoie des réponses déterministes :

| Requête                           | Réponse                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `GET /auth/login/`                | `200` + `set-cookie: csrftoken=test-csrf`                         |
| `POST /auth/login/` (admin/admin) | `302` + `set-cookie: sessionid=test-session, csrftoken=test-csrf` |
| `POST /auth/login/` (autre)       | `200` + HTML "invalid"                                            |
| `POST /auth/logout/`              | `302` + `sessionid=""; Max-Age=0`                                 |

Ces réponses **ne sont jamais enregistrées** dans `tapes/`. Pourquoi :

- Pulp génère un `csrftoken` et un `sessionid` différents à chaque login. Stocker ces valeurs dans des cassettes et matcher les requêtes dessus rendrait l'ajout de nouveaux tests impossible (chaque nouveau login produirait des cookies inconnus des cassettes existantes, et/ou les cookies enregisrés dans les cassettes de login seraient invalides depuis longtemps).
- Tester un login avec un mauvais mot de passe ou le fallback session → basic auth devient trivial : le mock valide les credentials par le body form-urlencoded, et le test "fallback" override la route via `page.route()` (cf. `session-auth.test.ts`).
- Aucun `sessionid` réel n'expire dans une cassette : les tests sont reproductibles sur la durée.

## Matching auth-agnostique des cassettes API

```js
ignoreHeaders: ['content-length', 'host', 'cookie', 'x-csrftoken', 'authorization'];
```

Talkback ignore donc ces headers lors du matching. Conséquence : la même cassette `GET /pulp/api/v3/distributions/...` matche que la requête vienne avec un cookie de session, un header `Authorization: Basic ...`, ou rien. Les bodies POST restent matchés (donc wrong-password produit bien une cassette différente du right-password — sauf que wrong-password est mocké en amont, donc pas de cassette du tout).

## Injection Basic Auth en mode record

Quand le proxy forward une requête vers Talkback (puis Pulp réel), il ajoute systématiquement `Authorization: Basic <admin:admin>` :

```js
const forwardedHeaders = { ...req.headers, authorization: BASIC_AUTH };
```

**Raison : pendant un re-record, le `sessionid=test-session` mocké est faux, Pulp réel le rejetterait. Avec le Basic Auth injecté, l'enregistrement fonctionne. En replay c'est inoffensif puisque `authorization` est dans `ignoreHeaders` et que Talkback ne contacte pas Pulp.**

## Commandes (depuis le devcontainer via `make`)

| Commande                                | Effet                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `make test`                             | Replay. Si une tape manque ET Pulp réel est joignable → enregistrement automatique de la tape. |
| `make test FILE=e2e/foo.test.ts`        | Pareil, sur un seul fichier. Voie recommandée pour ajouter/enrichir un test.                   |
| `make test-record`                      | Reset complet : `rm -rf tapes/` puis full record. **Destructif**, requiert Pulp en marche.     |
| `make test-record FILE=e2e/foo.test.ts` | Idem, mais ne re-record que les tests du fichier (les autres tapes restent supprimées).        |

### Workflow recommandé pour ajouter un test

1. Écrire le test.
2. Si le test touche à des endpoints déjà cachés, supprimer manuellement les tapes concernées : `rm e2e/tapes/GET_pulp_api_v3_<endpoint>_*`.
3. `make test FILE=e2e/foo.test.ts` — Talkback enregistre automatiquement ce qui manque, sans toucher aux autres cassettes.
4. Commit `e2e/foo.test.ts` + les nouvelles tapes.

### Quand utiliser `make test-record`

Uniquement quand on veut repartir d'un état propre (gros refactor du proxy, changement de version Pulp, dérive massive des tapes). Nécessite `make start-pulp` au préalable et `make seed` pour les données de test.

## Organisation des tests

- `*.test.ts` : un fichier par feature, pas de séparation par projet Playwright (le mock `/auth/logout/` rend la séparation `main`/`logout` inutile).
- `helpers/login.ts` : `login(page)` (session auth) et `loginBasicAuth(page)` (force la case "Basic Auth" du formulaire).
- `helpers/shared-list-tests.ts` : factories réutilisables pour les pages liste/détail (`testListPage`, `testDetailPage`).
- `reporters/structured-reporter.ts` : reporter Playwright custom.
- `tapes/` : cassettes JSON5 nommées `<METHOD>_<sanitized_path>__<counter>.json5`. Aucune cassette `auth_*` ne doit jamais y apparaître — elles sont mockées dans le proxy.
