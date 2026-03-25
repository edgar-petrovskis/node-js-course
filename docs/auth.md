# Auth Guide

## Overview

This project implements JWT-based authentication with Access + Refresh tokens and role-based authorization (RBAC).

- Access token TTL: `JWT_ACCESS_TTL` (default `15m`)
- Refresh token TTL: `JWT_REFRESH_TTL` (default `7d`)
- Access secret: `JWT_SECRET`
- Refresh secret: `JWT_REFRESH_SECRET`

## Auth Endpoints

### `POST /auth/register`

Creates a new USER and returns tokens.

Request:

```json
{
  "email": "new.user@coffee.local",
  "password": "NewUser123!"
}
```

Response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

### `POST /auth/login`

Returns access + refresh tokens.

Request:

```json
{
  "email": "admin@coffee.local",
  "password": "Admin123!"
}
```

### `POST /auth/refresh`

Accepts refresh token and returns a new access token.

Request:

```json
{
  "refreshToken": "<jwt>"
}
```

Response:

```json
{
  "accessToken": "<jwt>"
}
```

### `POST /auth/logout`

Invalidates refresh token for the user.

Request:

```json
{
  "refreshToken": "<jwt>"
}
```

Response:

```json
{
  "ok": true
}
```

## Bearer Token Usage

Protected routes require:

```text
Authorization: Bearer <accessToken>
```

## Public vs Protected

Public:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /products`

Protected:

- `POST /orders`
- GraphQL `Query.orders`

## RBAC

Roles are `USER` and `ADMIN`.

- `@Roles(...)` metadata decorator marks required roles.
- `RolesGuard` enforces role checks.
- Current admin-only example: `DELETE /users/:id` requires `ADMIN`.

## GraphQL Auth

GraphQL endpoint: `POST /graphql`

Protected query example:

```json
{
  "query": "query { orders { totalCount pageInfo { hasNextPage hasPreviousPage } } }"
}
```

Without Bearer token it should return `Unauthorized`.

## Seed Users (development)

Current seed users:

- `admin@coffee.local` / `Admin123!`
- `user@coffee.local` / `User123!`

If you changed `scripts/seed.ts`, rebuild and run seed:

```bash
docker compose -f compose.yml -f compose.dev.yml run --rm --build seed
```
