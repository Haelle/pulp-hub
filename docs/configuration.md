# Configuration

PulpHub est une SPA statique servie par nginx. Toute la configuration runtime passe par des **variables d'environnement** lues par un hook d'entrypoint nginx au démarrage du conteneur. Aucune valeur n'est compilée dans les bundles JS — un simple restart du conteneur avec une nouvelle valeur d'env est suffisant pour reconfigurer l'application, sans rebuild.

## Variables d'environnement

| Variable   | Requis | Défaut | Description                                                                                                           |
| ---------- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `PULP_URL` | ✅     | —      | URL publique de l'API Pulp, telle que vue par le **navigateur** des utilisateurs (pas l'URL interne au réseau Docker) |

Le hook refuse de démarrer si `PULP_URL` est manquant et affiche une erreur en rouge sur stderr — `set -e` dans le `docker-entrypoint.sh` de nginx fait avorter le démarrage de nginx.

## Comment ça marche

L'image `nginx:alpine` lance, à chaque démarrage, tous les scripts trouvés dans `/docker-entrypoint.d/` (hooks officiels). PulpHub installe son hook `40-pulphub-config.sh` dans ce répertoire — pas d'override d'`ENTRYPOINT`, donc on garde aussi les hooks par défaut de nginx (rendu de templates `/etc/nginx/templates`, ajustement IPv6, workers, etc.).

1. Le hook (`docker/40-pulphub-config.sh`) lit `PULP_URL` au démarrage du conteneur, strip un éventuel slash de fin et appelle `envsubst` sur le template `/var/www/config.js.tpl` (copié depuis `docker/config.js.tpl`) pour produire `/var/www/config.js` à côté :

   ```js
   window.__PULPHUB__ = { PULP_URL: 'https://pulp.example.com' };
   ```

2. nginx sert ce `config.js` avec `Cache-Control: no-store` (cf. `nginx/pulphub.conf`) — un restart du conteneur avec une autre valeur est immédiatement reflété, le navigateur n'a rien en cache.
3. `index.html` charge `<script src="/config.js">` **avant** les bundles SvelteKit. Le module `src/lib/config.ts` lit `window.__PULPHUB__.PULP_URL` à l'évaluation et l'expose comme constante au reste de l'app.

## Important — `PULP_URL` est une URL côté navigateur

`PULP_URL` est l'URL que **le navigateur des utilisateurs** va appeler, **pas** celle que le conteneur PulpHub utiliserait pour parler à Pulp. PulpHub ne fait aucun proxy : c'est une SPA, tous les `fetch` partent du navigateur et vont directement à Pulp.

Conséquence : l'URL doit être **résolvable et accessible depuis le poste de chaque utilisateur**. Quelques exemples typiques :

| Scénario                                         | `PULP_URL`                           |
| ------------------------------------------------ | ------------------------------------ |
| PulpHub et Pulp sur la même machine, accès local | `http://localhost:8081`              |
| Pulp en prod, derrière un nom de domaine         | `https://pulp.example.com`           |
| PulpHub dans un docker-compose, accès host       | `http://localhost:8081` (port mappé) |

⚠️ Ne **pas** utiliser `host.docker.internal`, le nom de service Docker (`pulp:80`) ou un IP de réseau Docker — le navigateur de l'utilisateur ne peut pas les résoudre.

## CORS

Comme PulpHub et Pulp sont sur des origines différentes (port différent suffit), Pulp doit être configuré pour autoriser les requêtes CORS depuis l'origine de PulpHub. Voir `nginx/pulp-cors-proxy.conf` pour un exemple de reverse proxy nginx avec :

- `Access-Control-Allow-Origin` (origine spécifique, **pas** `*`, parce que l'app utilise `credentials: include` pour la session auth)
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Headers` incluant `Authorization, Content-Type, X-CSRFToken`

Pour le déploiement cross-origin avec session auth en HTTPS, voir aussi la section _« Session auth with cross-origin deployment »_ du [README principal](../README.md).

## Changement à chaud

Pas de rebuild nécessaire pour pointer vers une autre instance Pulp :

```bash
docker stop pulphub && docker rm pulphub
docker run -d --name pulphub -p 8080:80 \
  -e PULP_URL=http://pulp.autre-instance.example \
  docker.io/estb/pulp-hub:latest
```

L'entrypoint régénère `/var/www/config.js` à chaque démarrage, le navigateur recharge la nouvelle valeur (cache désactivé sur ce fichier).
