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

## Documentation

- Auth guide: `docs/auth.md`

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

## Database access from local PgAdmin

- In dev mode (`compose.dev.yml`) Postgres is published on `localhost:5433`
- You can connect from local PgAdmin with:
- host: `localhost`
- port: `5433`
- database: `${DATABASE_NAME}` (default `node_course`)
- user: `${DATABASE_USER}` (default `postgres`)
- password: `${DATABASE_PASSWORD}` (from `.env`)
- In prod-like mode (`compose.yml`) Postgres is intentionally private and is not published to host

## Verification evidence

### Commands used

```bash
docker image ls | grep node-js-course
docker history --human --format "table {{.ID}}\t{{.Size}}\t{{.CreatedBy}}" node-js-course:test-prod
docker history --human --format "table {{.ID}}\t{{.Size}}\t{{.CreatedBy}}" node-js-course:test-distroless
docker run --rm --entrypoint id node-js-course:test-prod
```

### Image size comparison

- `node-js-course:test-dev` -> `1.17GB` (disk usage `205MB`)
- `node-js-course:test-prod` -> `396MB` (disk usage `77.9MB`)
- `node-js-course:test-distroless` -> `371MB` (disk usage `69.9MB`)

### Layer comparison summary

- `test-dev` is the heaviest image because it keeps full dependencies/tooling for local development
- `test-prod` contains larger base runtime layers from `node:22-alpine` plus app `node_modules`
- `test-distroless` keeps app layers (`node_modules`, `dist`) but uses a smaller/cleaner runtime base
- Largest app layer in both images is `node_modules` (`~141MB`)

### Non-root proof

- `docker run --rm --entrypoint id node-js-course:test-prod` output: `uid=1000(node) gid=1000(node)`
- `prod-distroless` uses `gcr.io/distroless/nodejs22-debian12:nonroot`

## Environment

Required variables:

- `PORT`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

Optional auth variables:

- `JWT_ACCESS_TTL` (default `15m`)
- `JWT_REFRESH_TTL` (default `7d`)
