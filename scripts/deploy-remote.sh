#!/usr/bin/env bash

set -euo pipefail

: "${DEPLOY_ROOT:?DEPLOY_ROOT is required}"
: "${COMPOSE_FILE_PATH:?COMPOSE_FILE_PATH is required}"
: "${APP_IMAGE:?APP_IMAGE is required}"
: "${GHCR_REGISTRY:?GHCR_REGISTRY is required}"
: "${GHCR_USERNAME:?GHCR_USERNAME is required}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required}"
: "${DATABASE_USER:?DATABASE_USER is required}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET is required}"

mkdir -p "${DEPLOY_ROOT}/deploy"
mkdir -p "${DEPLOY_ROOT}/scripts"

cat > "${DEPLOY_ROOT}/.env.runtime" <<EOF
APP_IMAGE=${APP_IMAGE}
APP_PORT=${APP_PORT:-8080}
DATABASE_USER=${DATABASE_USER}
DATABASE_PASSWORD=${DATABASE_PASSWORD}
DATABASE_NAME=${DATABASE_NAME}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
EOF

echo "${GHCR_TOKEN}" | docker login "${GHCR_REGISTRY}" -u "${GHCR_USERNAME}" --password-stdin

docker compose \
  --project-name "${COMPOSE_PROJECT_NAME:-node-js-course}" \
  --env-file "${DEPLOY_ROOT}/.env.runtime" \
  -f "${COMPOSE_FILE_PATH}" \
  pull

docker compose \
  --project-name "${COMPOSE_PROJECT_NAME:-node-js-course}" \
  --env-file "${DEPLOY_ROOT}/.env.runtime" \
  -f "${COMPOSE_FILE_PATH}" \
  up -d

if [[ -n "${SMOKE_URL:-}" ]]; then
  curl --fail --silent --show-error "${SMOKE_URL}" > /dev/null
fi
