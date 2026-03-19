FROM mcr.microsoft.com/devcontainers/typescript-node:24

# Python + pipx for pulp-cli
RUN apt-get update \
    && apt-get install -y --no-install-recommends pipx \
    && rm -rf /var/lib/apt/lists/*

# Install pulp-cli via pipx as the node user
USER node
RUN pipx install "pulp-cli[container,file]"
ENV PATH="/home/node/.local/bin:${PATH}"
USER root
