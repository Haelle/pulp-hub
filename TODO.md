# TODO

- seed : pas besoin de créer des repo, faut juste des pull-through avec des exemples
- pourquoi deux pull through pour npm ?
- /repositories → renommer en /images, lister toutes les images container (tous repos confondus), chaque carte indique la source (dockerhub-cache, dockerhub/library, etc.), filtre par distribution + texte, même approche que /npm
- toujours bug sur les screenshots générés
- tester npm pull-through
  - et pages dédiées
- tester python pull-through
  - et pages dédiées
- regénérer les cassettes à partir d'un Pulp vite (là il y a kavita)
- configurer TOKEN_SERVER Pulp (`PULP_TOKEN_SERVER=http://<host>/token/`) au lieu de TOKEN_AUTH_DISABLED pour un usage prod
  - TOKEN_AUTH_DISABLED=true = registry ouvert, pas de podman login nécessaire (dev only)
  - en prod : TOKEN_SERVER + TOKEN_SIGNATURE_ALGORITHM (ES256/RS256) + TOKEN_AUTH_KEY (clé privée)
  - générer une paire de clés (openssl ecparam pour ES256 ou openssl genrsa pour RS256)
  - flow : podman login envoie les credentials Django au /token/, Pulp renvoie un JWT signé, utilisé ensuite pour pull/push
  - le TOKEN_SERVER doit être l'URL publique vue par le client (pas une URL interne)
- configurer pulp ciiso en pull-through et update les dépôt pour pointer dessus !
