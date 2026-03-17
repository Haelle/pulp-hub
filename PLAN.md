# PulpHub — Plan de développement

UI de visualisation des dépôts d'images container Pulp.
Inspirée de Docker Hub. Stack : **SvelteKit + shadcn-svelte uniquement** — pas de backend intermédiaire, appels directs vers l'API Pulp via les server routes SvelteKit.

---

## Architecture finale

```text
Navigateur
    │  Pas d'appel API direct (token jamais exposé côté client)
    ▼
SvelteKit server routes (+page.server.ts / +server.ts)
    │  Authorization: Token <pulp_token>  (cookie httpOnly de session)
    ▼
Pulp API (/pulp/api/v3/  +  /auth/token/)
```

**Flux d'authentification :**

1. L'utilisateur saisit `username` + `password` sur la page login PulpHub.
2. La server route SvelteKit appelle `POST /auth/token/` sur Pulp.
3. Pulp retourne `{ token }`.
4. Le token est stocké dans un **cookie httpOnly de session** — jamais exposé au JavaScript client.
5. Chaque appel suivant depuis les server routes injecte `Authorization: Token <token>`.

---

## Structure du dépôt (monorepo)

```text
pulphub/
├── ui/                        # SvelteKit
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   └── pulp.ts    # Wrappers fetch vers Pulp (server-side uniquement)
│   │   │   └── components/
│   │   │       ├── ui/        # shadcn-svelte
│   │   │       ├── RepoCard.svelte
│   │   │       ├── TagRow.svelte
│   │   │       ├── PullCommand.svelte
│   │   │       └── LayerList.svelte
│   │   ├── routes/
│   │   │   ├── +layout.svelte
│   │   │   ├── +layout.server.ts      # Guard global : redirect /login si pas de token
│   │   │   ├── login/
│   │   │   │   ├── +page.svelte
│   │   │   │   └── +page.server.ts    # POST /auth/token/ → cookie httpOnly
│   │   │   └── (app)/
│   │   │       ├── repositories/
│   │   │       │   ├── +page.svelte
│   │   │       │   └── +page.server.ts
│   │   │       └── repositories/[name]/
│   │   │           ├── +page.svelte
│   │   │           ├── +page.server.ts
│   │   │           └── tags/[tag]/
│   │   │               ├── +page.svelte
│   │   │               └── +page.server.ts
│   ├── package.json
│   ├── svelte.config.js
│   └── Dockerfile
├── scripts/
│   └── seed.sh                # Peuplement Pulp local pour les tests
├── docker-compose.yml         # Dev local (SvelteKit uniquement, Pulp fourni séparément)
├── PLAN.md
└── README.md
```

---

## Règles du processus

- **Une étape à la fois.** Aucun travail sur l'étape N+1 avant la revue de code de l'étape N.
- **Revue de code entre chaque étape.** La revue valide : lisibilité, structure, conformité aux conventions, absence de dette technique évidente.
- **L'IA teste elle-même avant soumission.** À chaque étape, avant de soumettre le code pour revue :
  1. L'URL Pulp + login/password sont fournis en paramètre.
  2. Le script `seed.sh` est exécuté pour peupler Pulp avec des données de test.
  3. Les appels API sont vérifiés manuellement (réponses Pulp, cas d'erreur).
  4. Le rendu des pages est vérifié (chargement, états vides, états d'erreur).
  5. **Le code n'est soumis pour revue que si tous les tests passent.**
- **Pas de BDD.** L'application est 100% read-only. Toutes les données viennent directement de l'API Pulp.

---

## Étape 0 — Environnement de test (script seed)

### Objectif

Disposer d'un script idempotent qui peuple un Pulp vierge avec des données de test
représentatives, utilisable avant chaque étape de validation.

### Paramètres d'entrée du script

```bash
./scripts/seed.sh \
  --pulp-url http://<host>:<port> \
  --username <user> \
  --password <pass>
```

### Ce que le script crée

1. **Récupération du token Pulp** via `POST /auth/token/`.
2. **3 remotes container** pointant vers des images publiques légères :
   - `docker.io/library/alpine` → tags `3.18`, `3.19`, `latest`
   - `docker.io/library/busybox` → tags `1.36`, `latest`
   - `docker.io/library/hello-world` → tag `latest`
3. **3 repositories container** associés aux remotes.
4. **Synchronisation** de chaque repo (pull des manifests depuis Docker Hub).
5. **3 distributions container** exposant chaque repo sur le registry Pulp local.
6. **Vérification finale** : appel `GET /pulp/api/v3/distributions/container/container/`
   et affichage du nombre de distributions créées.

### Idempotence

Le script vérifie l'existence de chaque ressource avant création (`GET` puis `POST` si absent).
Il peut être rejoué sans erreur sur un Pulp déjà peuplé.

### Critères de validation (revue de code)

- [ ] Le script s'exécute sans erreur sur un Pulp vierge
- [ ] Le script est idempotent (deuxième exécution = aucune erreur, aucun doublon)
- [ ] Les 3 distributions sont visibles dans `GET /pulp/api/v3/distributions/container/container/`
- [ ] Les tags sont accessibles via `GET /pulp/api/v3/content/container/tags/`

---

## Étape 1 — Squelette SvelteKit + configuration

### Objectif

Initialiser le projet SvelteKit avec shadcn-svelte, définir le dark theme,
configurer les variables d'environnement, et vérifier que le projet démarre.

### Contenu de l'étape

**Installation et configuration :**

- SvelteKit avec adaptateur Node (`@sveltejs/adapter-node`)
- shadcn-svelte initialisé
- Variables d'environnement : `PULP_BASE_URL` dans `.env` (accessible uniquement server-side via `$env/static/private`)
- `app.css` : dark theme complet avec variables CSS

**Design — dark theme industriel :**

- Fond : `#0f1117`
- Surface : `#1a1d27`
- Accent : `#e8ff41` (jaune électrique)
- Police texte : `Geist`
- Police monospace (digests, commandes) : `JetBrains Mono`

**Livrable :** projet qui démarre sur `localhost:5173`, page d'accueil vide avec le thème appliqué.

### Vérification avant revue

- Démarrer le projet : `npm run dev`
- Vérifier le rendu du thème dans le navigateur
- Vérifier qu'aucune variable d'environnement n'est exposée côté client

### Critères de validation (revue de code)

- [ ] `PULP_BASE_URL` importée depuis `$env/static/private` uniquement dans les server routes
- [ ] Le thème dark est cohérent (pas de flash blanc au chargement)
- [ ] Les polices se chargent correctement
- [ ] `npm run build` passe sans erreur

---

## Étape 2 — Authentification (login / cookie httpOnly)

### Objectif

Implémenter la page login et le mécanisme de session par cookie httpOnly.

### Contenu de l'étape

**Fichiers à créer :**

```
routes/login/
├── +page.svelte          # Formulaire username + password
└── +page.server.ts       # Action SvelteKit : POST /auth/token/ → cookie
routes/logout/
└── +server.ts            # DELETE cookie → redirect /login
routes/+layout.server.ts  # Guard global
```

**Comportement :**

- `+page.server.ts` (action `login`) :
  1. Reçoit `username` + `password` du formulaire.
  2. Appelle `POST <PULP_BASE_URL>/auth/token/` avec `{ username, password }`.
  3. En cas de succès : pose un cookie `pulp_token` httpOnly, SameSite=Strict, puis redirect `/repositories`.
  4. En cas d'échec Pulp (401) : retourne `{ error: "Identifiants invalides" }` affiché dans le formulaire.
- `+layout.server.ts` : lit le cookie `pulp_token`. Si absent, redirect `/login`. Si présent, passe `username` à toutes les pages via `locals`.
- `routes/logout/+server.ts` : efface le cookie, redirect `/login`.
- `Navbar.svelte` : affiche le username + bouton logout.

### Vérification avant revue

- Seed Pulp avec `seed.sh`
- Tester login avec credentials valides → redirect `/repositories`
- Tester login avec mauvais password → message d'erreur affiché
- Vérifier dans les DevTools que le cookie est bien `httpOnly` (non lisible en JS)
- Tester logout → redirect `/login`, cookie effacé
- Tester accès direct à `/repositories` sans cookie → redirect `/login`

### Critères de validation (revue de code)

- [ ] Le token Pulp n'apparaît à aucun moment dans le HTML rendu ou les réponses JSON client
- [ ] Le cookie est `httpOnly`, `SameSite=Strict`, `Secure` en production
- [ ] Les erreurs d'auth Pulp sont catchées et affichées proprement (pas de stack trace)
- [ ] Le guard de layout fonctionne sur rechargement de page

---

## Étape 3 — Page liste des repositories

### Objectif

Afficher la liste paginée des distributions container Pulp sous forme de grille de cartes.

### Contenu de l'étape

**Appel Pulp utilisé :**

```
GET /pulp/api/v3/distributions/container/container/?limit=20&offset=0
```

**Fichiers à créer :**

```
lib/api/pulp.ts                          # getDistributions(token, limit, offset)
lib/components/RepoCard.svelte           # Carte : nom, base_path, registry_path
routes/(app)/repositories/
├── +page.server.ts                      # Charge les distributions, passe au template
└── +page.svelte                         # Grille + pagination + filtre client
```

**`RepoCard.svelte` affiche :**

- Nom de la distribution
- `registry_path` (adresse de pull)
- `base_path`
- Lien vers `/repositories/[name]`

**Pagination :** composant shadcn `Pagination`, 20 items par page, `offset` passé en query param URL.

**Filtre :** barre de recherche client-side filtrant sur `name` et `base_path` dans les résultats chargés.

**États :** skeleton loader pendant le chargement, état vide "Aucun dépôt disponible" si `count === 0`.

### Vérification avant revue

- Seed Pulp, vérifier que les 3 distributions apparaissent
- Tester le filtre (taper "alp" → seul alpine visible)
- Tester la pagination avec plus de 20 repos (modifier `limit=2` temporairement)
- Tester l'état vide sur un Pulp sans distributions

### Critères de validation (revue de code)

- [ ] L'appel Pulp est dans `lib/api/pulp.ts`, pas dans `+page.server.ts`
- [ ] Le skeleton loader s'affiche bien pendant le fetch
- [ ] La pagination met à jour l'URL (query param `offset`)
- [ ] Le filtre est insensible à la casse

---

## Étape 4 — Page détail d'un repository et ses tags

### Objectif

Afficher le détail d'une distribution et la liste de ses tags avec digest et date.

### Contenu de l'étape

**Appels Pulp utilisés :**

```
GET /pulp/api/v3/distributions/container/container/?name={name}
GET /pulp/api/v3/content/container/tags/?repository_version={href}&limit=100
```

**Fichiers à créer :**

```
lib/api/pulp.ts                     # + getDistribution(token, name), getTags(token, repoVersionHref)
lib/components/TagRow.svelte        # Ligne : nom tag, digest tronqué, date
lib/components/PullCommand.svelte   # Commande pull + bouton copie clipboard
routes/(app)/repositories/[name]/
├── +page.server.ts                 # Charge distribution + tags
└── +page.svelte                    # Affichage détail + tableau tags
```

**`+page.svelte` affiche :**

- En-tête : nom, `registry_path`, badge "Container Image"
- `PullCommand` : `podman pull <registry_path>:<premier_tag>`
- Tableau des tags trié par date décroissante : nom, digest (8 premiers chars + tooltip complet), date de création

**Résolution tags :** la distribution pointe vers un `repository` href → récupérer la `latest_version_href` → appeler l'endpoint tags avec ce href.

**`PullCommand.svelte` :**

- Affiche la commande en monospace dans un bloc stylisé
- Bouton copie avec feedback visuel (icône check pendant 2s)

### Vérification avant revue

- Naviguer vers `/repositories/alpine`
- Vérifier que les tags `3.18`, `3.19`, `latest` apparaissent
- Tester la copie de la pull command dans le clipboard
- Tester le tooltip sur le digest tronqué
- Tester une URL invalide `/repositories/inexistant` → page 404

### Critères de validation (revue de code)

- [ ] La chaîne de résolution distribution → version → tags est dans `lib/api/pulp.ts`
- [ ] Un repo inexistant retourne une page 404 SvelteKit (`error(404, ...)`)
- [ ] Le digest est tronqué à l'affichage mais complet dans le tooltip
- [ ] `PullCommand` fonctionne même si le repo n'a aucun tag

---

## Étape 5 — Page détail d'un tag (manifest + layers)

### Objectif

Afficher le manifest complet d'un tag : architecture, OS, liste des layers avec taille.

### Contenu de l'étape

**Appels Pulp utilisés :**

```
GET /pulp/api/v3/content/container/tags/?name={tag}&repository_version={href}
GET /pulp/api/v3/content/container/manifests/{href}/   # manifest du tag
GET /pulp/api/v3/content/container/blobs/{href}/       # config blob (arch, OS)
```

**Fichiers à créer :**

```
lib/api/pulp.ts                     # + getTag(token, name, tag), getManifest(token, href)
lib/components/LayerList.svelte     # Liste layers : digest tronqué, taille human-readable
routes/(app)/repositories/[name]/tags/[tag]/
├── +page.server.ts                 # Charge tag + manifest + config blob
└── +page.svelte                    # Affichage complet
```

**`+page.svelte` affiche :**

- En-tête : `name:tag`, digest complet, badges architecture + OS (si disponibles)
- `PullCommand` avec tag fixé
- `LayerList` : chaque layer avec digest tronqué, taille en MB/KB, media_type
- Taille totale de l'image (somme des layers)

**`LayerList.svelte` :**

- Conversion bytes → human-readable (`formatBytes`)
- Digest tronqué avec tooltip

### Vérification avant revue

- Naviguer vers `/repositories/alpine/tags/latest`
- Vérifier architecture (`amd64`), OS (`linux`)
- Vérifier que les layers s'affichent avec leurs tailles
- Vérifier la taille totale
- Tester un tag inexistant → 404

### Critères de validation (revue de code)

- [ ] `formatBytes` est dans `lib/utils.ts`, pas dans le composant
- [ ] La taille totale exclut le config blob (seulement les layers)
- [ ] Architecture et OS sont affichés comme "inconnu" si le blob config ne les expose pas
- [ ] La page fonctionne pour des manifests multi-arch (manifest list) sans crasher

---

## Étape 6 — Recherche globale, polish et responsive

### Objectif

Finaliser l'application : recherche cross-repos, responsive mobile, polish visuel.

### Contenu de l'étape

**Recherche globale :**

- `SearchBar.svelte` dans la Navbar
- Appel `GET /pulp/api/v3/distributions/container/container/?name__icontains={q}` (filtre natif Pulp)
- Debounce 300ms, dropdown de résultats en temps réel
- Navigation vers `/repositories/[name]` au clic

**Polish visuel :**

- Skeleton loaders (shadcn `Skeleton`) sur toutes les pages
- États vides explicites avec icône sur chaque page
- Transitions de page (fade SvelteKit)
- Favicon PulpHub

**Responsive :**

- `RepoCard` : 1 col mobile, 2 tablet, 3 desktop
- Tableau tags : colonnes digest et media_type masquées sur mobile
- `LayerList` : digest plus court sur mobile
- Navbar : menu hamburger sur mobile

**Qualité finale :**

- `.env.example` documenté
- `README.md` : prérequis, démarrage en 3 commandes, utilisation de `seed.sh`
- Gestion de l'erreur si `PULP_BASE_URL` est injoignable (message sur la page login)

### Vérification avant revue

- Tester la recherche "alp" → dropdown avec alpine
- Vérifier le rendu sur viewport 375px (mobile)
- Simuler une URL Pulp injoignable → message d'erreur sur login
- Vérifier que tous les skeletons s'affichent (throttle réseau dans DevTools)

### Critères de validation (revue de code)

- [ ] La recherche utilise le filtre `name__icontains` natif Pulp (pas de filtre client)
- [ ] Le debounce évite les appels inutiles (1 appel max toutes les 300ms)
- [ ] L'app est utilisable sur mobile sans scroll horizontal
- [ ] Le README permet à un nouvel arrivant de lancer l'app sans aide

---

## Récapitulatif

| #   | Étape               | Livrable principal                 | Test avant revue                       |
| --- | ------------------- | ---------------------------------- | -------------------------------------- |
| 0   | Script seed         | `seed.sh` idempotent               | Pulp peuplé avec 3 distrib             |
| 1   | Squelette SvelteKit | Projet qui démarre + dark theme    | `npm run dev` + `npm run build`        |
| 2   | Auth login/cookie   | Login → cookie httpOnly → redirect | Login valide + invalide + logout       |
| 3   | Liste repositories  | Grille de RepoCard paginée         | 3 repos visibles + filtre + pagination |
| 4   | Détail repo + tags  | Tableau des tags + pull command    | Tags alpine visibles + copie commande  |
| 5   | Détail tag + layers | Manifest + layers + tailles        | Layers alpine:latest + taille totale   |
| 6   | Recherche + polish  | App complète et responsive         | Recherche + mobile + erreurs           |
