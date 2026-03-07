# Testing Guide

## Day-to-day commands

Run unit tests:

```bash
yarn test
```

Run all e2e tests from host machine (with DB env):

```bash
yarn test:e2e:db
```

Run a single e2e spec from host machine:

```bash
yarn test:e2e:db:file test/files.e2e-spec.ts
```

Run Files DB integration spec:

```bash
RUN_DB_INTEGRATION_TESTS=1 yarn test:integration:db src/application/files/files.service.integration.spec.ts
```

## Notes

1. Use `yarn test:e2e:db` from host machine, not plain `yarn test:e2e`.
2. `RUN_DB_E2E_TESTS=1` gates `test/files.e2e-spec.ts`.
3. `RUN_DB_INTEGRATION_TESTS=1` gates `src/application/files/files.service.integration.spec.ts`.
4. In dev compose mode Postgres is exposed as `localhost:5433`.
5. `test/app.e2e-spec.ts` currently validates `GET /` returns `401` (global auth guard enabled).
