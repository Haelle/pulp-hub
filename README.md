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
