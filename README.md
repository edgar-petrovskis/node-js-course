# Node.js Course API

Backend API for a learning e-commerce project (coffee store) built with NestJS + TypeORM + PostgreSQL.

## Tech stack

- Node.js + NestJS
- PostgreSQL
- TypeORM (migrations + seed)
- Swagger (`/api` in non-production)

## Project structure

- `src/interfaces/*` - controllers and HTTP DTOs
- `src/application/*` - business logic/services
- `src/infrastructure/*` - DB config, entities, migrations, swagger setup
- `scripts/seed.ts` - seed data

## Prerequisites

- Node.js 20+
- Yarn
- Docker (for local PostgreSQL)

## Run from scratch

1. Install dependencies:

```bash
yarn install
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Run migrations:

```bash
yarn migrate:up
```

4. Seed initial data:

```bash
yarn seed
```

5. Start API:

```bash
yarn start:dev
```

API default URL: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api`

## Environment

Use `.env` (see `.env.example` for minimal required variables):

- `PORT`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`

## Useful scripts

- `yarn start:dev` - run app with watch mode
- `yarn typecheck` - run TypeScript type check
- `yarn migration:run` / `yarn migrate:up` - apply migrations
- `yarn migration:revert` - rollback last migration
- `yarn seed` - run seed script
