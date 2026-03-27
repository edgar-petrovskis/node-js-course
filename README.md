# Node.js Course API

Backend API for a learning e-commerce project (coffee store) built with NestJS + TypeORM + PostgreSQL.

## Tech stack

- Node.js + NestJS
- GraphQL + Apollo
- DataLoader
- PostgreSQL
- TypeORM (migrations + seed)
- Docker
- Swagger (`/api` in non-production)

## Project structure

- `src/interfaces/*` - transport layer (REST controllers, GraphQL resolvers/DTOs)
- `src/application/*` - application services and business use-cases
- `src/domain/*` - domain enums/types and core business logic
- `src/config/*` - application configuration and env mapping
- `src/infrastructure/*` - database config, entities, repositories, migrations, swagger setup

## Prerequisites

- Docker
- Docker Compose

## Containerization

Current containerization setup is considered done when:

- `docker compose -f compose.yml up --build` starts `api + postgres` and API responds on `http://localhost:8080`
- PostgreSQL is not exposed in `compose.yml` (`ports:` is absent for `postgres`)
- `Dockerfile` has `dev`, `build`, `prod`, `prod-distroless` targets
- `prod-distroless` target starts backend successfully
- migrations and seed run as one-off jobs (`migrate`, `seed`)
- dev mode works via bind mount + hot reload (`compose.dev.yml`)
- repository includes `.dockerignore`, `.env.example`, and this README with run/verification commands

## Start development from zero

1. Create local env file:

```bash
cp .env.example .env
```

2. Start dev stack (API + Postgres with hot reload):

```bash
docker compose -f compose.yml -f compose.dev.yml up --build
```

3. Run migrations:

```bash
docker compose -f compose.yml -f compose.dev.yml run --rm migrate
```

4. Seed initial data:

```bash
docker compose -f compose.yml -f compose.dev.yml run --rm seed
```

5. API endpoints:

- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/api`

## Dev smoke check

Run this after starting dev stack:

```bash
curl -s -o /dev/null -w "status=%{http_code}\n" http://localhost:8080/
```

Expected result:

```text
status=401
```

## Run prod-like stack

Use this mode to run local environment close to production runtime:

```bash
docker compose -f compose.yml up --build
```

Then run one-off jobs if needed:

```bash
docker compose -f compose.yml run --rm migrate
docker compose -f compose.yml run --rm seed
```

## CI/CD

This repository uses a production-like GitHub Actions pipeline with this branch flow:

- `feature/* -> develop -> main`
- pull requests to `develop` and `main` run CI checks
- pushes to `develop` run build + automatic stage deploy
- production deploy is started manually from `main` and requires approval

### Workflows

- `pr-checks.yml` runs dependency installation, lint, unit tests, and Docker build validation
- `build-and-stage.yml` builds a Docker image, pushes it to GHCR with an immutable `sha-<commit>` tag, stores a `release-manifest.json`, and deploys the same image to stage
- `deploy-prod.yml` deploys the exact same immutable image tag to production without rebuilding it

### Deploy Model

- Registry: GHCR
- Deploy target: GitHub Actions self-hosted runner + Minikube
- Stage namespace: `coffee-stage`
- Production namespace: `coffee-prod`
- Manual approval: GitHub Environment `production`

### End-to-End Flow

1. Open a PR to `develop` or `main` and wait for `PR Checks`.
2. Merge into `develop` to trigger `Build And Stage`.
3. The pipeline builds and pushes `ghcr.io/edgar-petrovskis/node-js-course:sha-<commit>`.
4. The self-hosted runner deploys that image to `coffee-stage` and runs an HTTP smoke check.
5. Run `Deploy Production` manually, approve the environment gate, and deploy the same `sha-<commit>` image to `coffee-prod`.

### Required GitHub Setup

- branch protection / rulesets for `develop` and `main`
- environments: `stage`, `production`
- required reviewer for `production`
- environment secrets for database config, JWT secrets, and GHCR pull credentials

## Documentation

- Auth guide: `docs/auth.md`
- Git flow: `docs/gitflow.md`

## Database access from local DBeaver

- In dev mode (`compose.dev.yml`) Postgres is published on `localhost:5433`
- You can connect from local DBeaver with:
- host: `localhost`
- port: `5433`
- database: `${DATABASE_NAME}` (default `node_course`)
- user: `${DATABASE_USER}` (default `postgres`)
- password: `${DATABASE_PASSWORD}` (from `.env`)
- In prod-like mode (`compose.yml`) Postgres is intentionally private and is not published to host
