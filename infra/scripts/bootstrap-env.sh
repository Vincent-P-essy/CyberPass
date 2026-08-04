#!/usr/bin/env bash
set -euo pipefail

repository_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
environment_file="$repository_dir/.env"
example_file="$repository_dir/.env.example"

if [[ -f "$environment_file" ]]; then
  printf 'Configuration existante conservée : %s\n' "$environment_file"
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  printf 'OpenSSL est requis pour générer les secrets locaux.\n' >&2
  exit 1
fi

cp "$example_file" "$environment_file"

jwt_secret="$(openssl rand -hex 32)"
database_password="$(openssl rand -hex 24)"
storage_password="$(openssl rand -hex 24)"
storage_app_password="$(openssl rand -hex 24)"

sed -i \
  -e "s/development-only-replace-with-32-random-characters/$jwt_secret/g" \
  -e "s/development-only-database-password/$database_password/g" \
  -e "s/development-only-minio-password/$storage_password/g" \
  -e "s/development-only-storage-app-password/$storage_app_password/g" \
  "$environment_file"

chmod 600 "$environment_file"
printf 'Configuration locale générée : %s\n' "$environment_file"
