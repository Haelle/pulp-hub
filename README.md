# PulpHub

UI de visualisation des dépôts d'images container Pulp, inspirée de Docker Hub.

## Prérequis

- [Dev Containers CLI](https://github.com/devcontainers/cli) (`npm install -g @devcontainers/cli`) (`.tool-versions` indique pour asdf quelle node a été utilisé)
- Docker

## Démarrage rapide

```bash
make up      # Démarre le devcontainer
make setup   # Installe pulp-cli + configure l'accès Pulp (interactif)
make seed    # Peuple Pulp avec des images de test
make dev     # Lance le serveur de dev (http://localhost:5173)
```

> Ce projet a besoin d'une instance de Pulp joignable
> `make setup` lance `pulp config create` qui demande l'URL, le login et le mot de passe
> de l'instance Pulp (par défaut : `https://pulp.local:8443`, `admin`/`admin`).
> Cette étape est nécessaire avant `make seed`.

## Makefile

Toutes les commandes passent par le devcontainer via `devcontainer exec`.
`make help` affiche la liste complète.

## Vérifier les données de test

```bash
make shell

# Puis dans le conteneur :
pulp container distribution list
pulp container repository list
pulp --format json container repository version list \
  --repository dockerhub/library/alpine
```

## Gestion des tags et mode on_demand

Pulp fonctionne en mode `on_demand` : lors d'un `sync`, seules les **metadata** (manifests, tags) sont téléchargées. Les **layers** (blobs) sont tirés à la demande lors d'un `pull`.

Conséquence : seuls les tags synchronisés sont disponibles. Pour ajouter un nouveau tag :

```bash
# Ajouter un tag au filtre du remote
pulp container remote update \
  --name "dockerhub/library/alpine" \
  --include-tags '["3.17","3.18","3.19","latest"]'

# Re-synchroniser le repo
pulp container repository sync \
  --name "dockerhub/library/alpine" \
  --remote "dockerhub/library/alpine"
```

Ensuite le tag est disponible via le registry Pulp :

```bash
podman pull pulp.local:8443/dockerhub/library/alpine:3.17 --tls-verify=false
```

Un `pull` sur un tag non synchronisé retournera `manifest unknown`.

> **Rate limiting Docker Hub** : sans authentification, Docker Hub limite à ~100 pulls/6h.
> Chaque tag synchronisé consomme des pulls (manifests + layers).
> C'est pourquoi `--include-tags` filtre sur un petit nombre de tags dans `seed.sh`.
> Sans ce filtre, une sync d'`alpine` tirerait des centaines de tags et épuiserait le quota.
