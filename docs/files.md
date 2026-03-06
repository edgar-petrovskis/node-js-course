# Files API (S3/MinIO)

## Overview

This module implements a presigned upload flow:

1. `POST /files/presign` -> backend creates a `PENDING` file record and returns a presigned PUT URL.
2. Client uploads file bytes directly to S3/MinIO using that URL.
3. `POST /files/complete` -> backend validates ownership, transitions `PENDING -> READY`, and binds file to domain entity.
4. `GET /files/:id/view` -> backend validates ownership and returns a short-lived presigned GET URL.

Backend does not proxy file bytes.

## Data Model

`file_records` stores metadata and lifecycle state:

- `owner_id`
- `purpose` (`USER_AVATAR`, `PRODUCT_IMAGE`)
- `entity_id`
- `key`
- `content_type`
- `size`
- `status` (`PENDING`, `READY`)
- `visibility` (`PRIVATE`, `PUBLIC`)
- `expires_at`

Domain bindings:

- `users.avatar_file_id -> file_records.id`
- `products.image_file_id -> file_records.id`

## Access Policy

- `/files/presign` requires auth.
- `purpose=PRODUCT_IMAGE` requires `ADMIN`.
- `/files/complete` is owner-only (`file_records.owner_id === req.user.id`).
- `/files/:id/view` is owner-only (`file_records.owner_id === req.user.id`).

Important: for `PRODUCT_IMAGE`, owner is the actor who requested presign (typically admin), not "any admin".

## API Contracts

### `POST /files/presign`

Request:

```json
{
  "purpose": "USER_AVATAR",
  "entityId": "uuid-optional-for-avatar-required-for-product",
  "contentType": "image/jpeg",
  "size": 12345,
  "visibility": "PRIVATE"
}
```

Response:

```json
{
  "fileId": "uuid",
  "key": "users/<user-id>/avatars/<uuid>.jpg",
  "uploadUrl": "https://...",
  "contentType": "image/jpeg"
}
```

### `POST /files/complete`

Request:

```json
{
  "fileId": "uuid"
}
```

Response:

```json
{
  "fileId": "uuid",
  "status": "READY"
}
```

### `GET /files/:id/view`

Response:

```json
{
  "url": "https://..."
}
```

## Postman Note

Presigned URLs are signed with the container host (`minio:9000`).
When sending PUT/GET from host machine via Postman to `localhost:9000`, set header:

```text
Host: minio:9000
```

Otherwise `SignatureDoesNotMatch` can occur.
