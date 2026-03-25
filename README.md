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
status=200
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

## Clean run log

```bash
git clone --branch feat/lesson-10 git@github.com:edgar-petrovskis/node-js-course.git
Cloning into 'node-js-course'...
Receiving objects: 100% (376/376), 232.66 KiB | 980.00 KiB/s, done.
Resolving deltas: 100% (178/178), done.

cd node-js-course/
cp .env.example .env

docker build --target prod .
[+] Building 2.0s (20/20) FINISHED                                                                                                                                                                                                                                                                docker:desktop-linux
 => [internal] load build definition from Dockerfile                                                                                                                                                                                                                                                              0.0s
 => => transferring dockerfile: 1.23kB                                                                                                                                                                                                                                                                            0.0s
 => resolve image config for docker-image://docker.io/docker/dockerfile:1
 ...
=> => unpacking to moby-dangling@sha256:b3404d355e1b6f9141dfdc49bd1160e6dee1644f2ba150dc1b3dec2721eb16b0                                                                                                                                                                                                         0.7s

docker build --target prod-distroless .
[+] Building 2.0s (26/26) FINISHED                                                                                                                                                                                                                                                                docker:desktop-linux
 => [internal] load build definition from Dockerfile                                                                                                                                                                                                                                                              0.0s
 => => transferring dockerfile: 1.23kB                                                                                                                                                                                                                                                                            0.0s
 => resolve image config for docker-image://docker.io/docker/dockerfile:1
 ...
=> => unpacking to moby-dangling@sha256:ea1f16e847ced329398182edc055046e5ef217e3f65f221cdec14142d5fefcda                                                                                                                                                                                                         0.7s

docker compose -f compose.yml up --build -d
[+] up 13/13
 ✔ Image postgres:16-alpine Pulled                                                                                                                                                                                                                                                                                7.4s
   ✔ 79adb56125dd           Pull complete                                                                                                                                                                                                                                                                         0.7s
   ✔ 3d85c14803ff           Pull complete                                                                                                                                                                                                                                                                         0.8s
   ✔ 4328d592a54b           Pull complete                                                                                                                                                                                                                                                                         0.6s
   ✔ 08bb20b6ce3e           Pull complete                                                                                                                                                                                                                                                                         0.8s
   ✔ b06d9135182e           Pull complete                                                                                                                                                                                                                                                                         0.8s
   ✔ 58563aacf9ee           Pull complete                                                                                                                                                                                                                                                                         0.8s
   ✔ 916f1ad40c12           Pull complete                                                                                                                                                                                                                                                                         0.9s
   ✔ 49b582240ca8           Pull complete                                                                                                                                                                                                                                                                         0.8s
   ✔ 3d8f3437ce1b           Pull complete                                                                                                                                                                                                                                                                         4.4s
   ✔ 7419a9c52e02           Pull complete                                                                                                                                                                                                                                                                         0.8s
   ✔ b2e8f55ae2fa           Download complete                                                                                                                                                                                                                                                                     0.0s
   ✔ 7efa8dcabfca           Download complete                                                                                                                                                                                                                                                                     0.0s
[+] Building 1.2s (28/28) FINISHED
...
+] up 19/19prod 6/7] COPY --from=build /app/dist ./dist                                                                                                                                                                                                                                                          0.0s
 ✔ Image postgres:16-alpine            Pulled                                                                                                                                                                                                                                                                     7.4s
   ✔ 79adb56125dd                      Pull complete                                                                                                                                                                                                                                                              0.7s
   ✔ 3d85c14803ff                      Pull complete                                                                                                                                                                                                                                                              0.8s
   ✔ 4328d592a54b                      Pull complete                                                                                                                                                                                                                                                              0.6s
   ✔ 08bb20b6ce3e                      Pull complete                                                                                                                                                                                                                                                              0.8s
   ✔ b06d9135182e                      Pull complete                                                                                                                                                                                                                                                              0.8s
   ✔ 58563aacf9ee                      Pull complete                                                                                                                                                                                                                                                              0.8s
   ✔ 916f1ad40c12                      Pull complete                                                                                                                                                                                                                                                              0.9s
   ✔ 49b582240ca8                      Pull complete                                                                                                                                                                                                                                                              0.8s
   ✔ 3d8f3437ce1b                      Pull complete                                                                                                                                                                                                                                                              4.4s
   ✔ 7419a9c52e02                      Pull complete                                                                                                                                                                                                                                                              0.8s
   ✔ b2e8f55ae2fa                      Download complete                                                                                                                                                                                                                                                          0.0s
   ✔ 7efa8dcabfca                      Download complete                                                                                                                                                                                                                                                          0.0s
 ✔ Image node-js-course-api            Built                                                                                                                                                                                                                                                                      1.3s
 ✔ Network node-js-course_public       Created                                                                                                                                                                                                                                                                    0.0s
 ✔ Network node-js-course_internal     Created                                                                                                                                                                                                                                                                    0.0s
 ✔ Volume node-js-course_pgdata        Created                                                                                                                                                                                                                                                                    0.0s
 ✔ Container node-js-course-postgres-1 Healthy                                                                                                                                                                                                                                                                    5.7s
 ✔ Container node-js-course-api-1      Created                                                                                                                                                                                                                                                                    0.0s

docker compose -f compose.yml run --rm migrate
WARN[0000] No services to build
[+]  1/1t 1/11
 ✔ Container node-js-course-postgres-1 Running                                                                                                                                                                                                                                                                    0.0s
Image node-js-course-migrate Building
[+] Building 0.8s (22/22) FINISHED
...
Migration AddProductsActivePriceIndex1740000000000 has been executed successfully.
query: COMMIT

docker compose -f compose.yml run --rm seed
WARN[0000] No services to build
[+]  2/2t 2/22
 ✔ Container node-js-course-postgres-1 Healthy                                                                                                                                                                                                                                                                    0.7s
 ✔ Container node-js-course-migrate-1  Started                                                                                                                                                                                                                                                                    0.8s
Image node-js-course-migrate Building
Image node-js-course-seed Building
[+] Building 0.8s (22/22) FINISHED
...
Image node-js-course-seed Built
Container node-js-course-postgres-1 Waiting
Container node-js-course-migrate-1 Waiting
Container node-js-course-migrate-1 Exited
Container node-js-course-postgres-1 Healthy
Container node-js-course-seed-run-560ab63cbceb Creating
Container node-js-course-seed-run-560ab63cbceb Created
[seed] users: [
  User {
    id: undefined,
    email: 'admin@coffee.local',
    passwordHash: undefined,
    role: 'ADMIN',
    refreshTokenHash: undefined,
    createdAt: undefined,
    updatedAt: undefined
  },
  User {
    id: undefined,
    email: 'user@coffee.local',
    passwordHash: undefined,
    role: 'USER',
    refreshTokenHash: undefined,
    createdAt: undefined,
    updatedAt: undefined
  }
]
[seed] products_with_stock_gt_0: 24
```
