# TODO

- toujours bug sur les screenshots générés

- tester python pull-through
  - et pages dédiées

- et comment ça marche pour le reste ? pas d'authent du coup ?
- configurer TOKEN_SERVER Pulp (`PULP_TOKEN_SERVER=http://<host>/token/`) au lieu de TOKEN_AUTH_DISABLED pour un usage prod
  - TOKEN_AUTH_DISABLED=true = registry ouvert, pas de podman login nécessaire (dev only)
  - en prod : TOKEN_SERVER + TOKEN_SIGNATURE_ALGORITHM (ES256/RS256) + TOKEN_AUTH_KEY (clé privée)
  - générer une paire de clés (openssl ecparam pour ES256 ou openssl genrsa pour RS256)
  - flow : podman login envoie les credentials Django au /token/, Pulp renvoie un JWT signé, utilisé ensuite pour pull/push
  - le TOKEN_SERVER doit être l'URL publique vue par le client (pas une URL interne)

- configurer pulp ciiso en pull-through et update les dépôt pour pointer dessus !
