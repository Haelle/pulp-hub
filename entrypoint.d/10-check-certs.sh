#!/bin/sh
set -e

if [ ! -f /etc/nginx/certs/cert.pem ] || [ ! -f /etc/nginx/certs/key.pem ]; then
    echo "ERROR: TLS certificates not found."
    echo "Mount them at /etc/nginx/certs/ (cert.pem + key.pem)"
    exit 1
fi
