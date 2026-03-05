## Part 1: Transactional `createOrder`

### 1.1 Idempotency (`Idempotency-Key`)

Implemented via request header:

- `POST /orders`
- `Idempotency-Key: <uuid>`
- new key -> creates a new order (`201`)
- same key + same user -> returns the existing order (`200`)

### 1.2 Transaction (`QueryRunner`)

`createOrder` runs in a single transaction:

- creating `Order`
- creating `OrderItems`
- updating `Product.stock`

Used flow:

- `connect()`
- `startTransaction()`
- `commitTransaction()`
- `rollbackTransaction()` in `catch`
- `release()` in `finally`

### 1.3 Oversell protection

Chosen approach: **pessimistic locking**.

What happens:

- product rows for all requested `productId` values are locked using `FOR NO KEY UPDATE`
- product existence is validated
- only then stock is decremented and order is created

Why this approach:

- no retry loop is needed

### 1.4 Error handling

- insufficient stock -> `409 Conflict`
- invalid/missing product -> `400 Bad Request`
- duplicate idempotency key -> existing order is returned (`200`)
- any other error -> `500 Internal server error`

Via `HttpExceptionFilter`, error responses include: `statusCode`, `message`, `timestamp`, `path`.

---

## Part 2: SQL Optimization

### 2.1 Chosen query

- `GET /products?search=espresso&sort=price_asc`

SQL:

```sql
SELECT
  p.id,
  p.title,
  p.description,
  p.price_cents,
  p.currency,
  p.stock,
  p.is_active,
  p.created_at,
  p.updated_at
FROM products p
WHERE p.is_active = true
  AND p.title ILIKE '%espresso%'
ORDER BY p.price_cents ASC;
```

### 2.2 EXPLAIN ANALYZE (before)

`EXPLAIN (ANALYZE, BUFFERS)` before optimization:

- `Seq Scan on products`
- `Sort (Sort Key: price_cents)`
- `Rows Removed by Filter: 22`
- `Execution Time: 0.137 ms`

### 2.3 Optimization

Added partial index:

```sql
CREATE INDEX IF NOT EXISTS idx_products_active_price
ON products (price_cents)
WHERE is_active = true;
```

Index is tracked by migration:

- `src/infrastructure/database/migrations/1740000000000-add-products-active-price-index.ts`

### 2.4 EXPLAIN ANALYZE (after)

`EXPLAIN (ANALYZE, BUFFERS)` after optimization:

- still `Seq Scan on products`
- still `Sort (Sort Key: price_cents)`
- `Execution Time: 0.103 ms`

### Additional check on larger dataset

To validate planner behavior beyond seed data, the `products` table was additionally filled with test records (about +50k rows), and the same `EXPLAIN` was run again.

Result:

- still `Seq Scan on products`
- `Rows Removed by Filter: 50022`
- `Execution Time: 22.874 ms`

### Planner conclusion

The index was added correctly, but planner still picked `Seq Scan`.

Reasons:

- on small datasets (seed), full scan is cheaper than `Index Scan`;
- `ILIKE '%...%'` (leading `%`) does not work well with a regular btree index for row filtering.

---

## Manually verified

- no partial writes: on transaction error, no `orders`/`order_items` are committed and stock is not changed
- idempotency: 2 identical requests with the same key -> 1 order
- oversell: 2 parallel requests for the last unit -> one `201`, one `409`

---

## How To Test

Full project setup from scratch (install, docker, migrations, seed, start) is described in `README.md`.

### Important note about current user

`POST /orders` currently uses a temporary `STUB_USER_ID`:

- `00000000-0000-0000-0000-000000000001`

Before testing, make sure this user exists in the `users` table.

### Part 1: createOrder

Preparation (SQL in pgAdmin):

```sql
INSERT INTO users (id, email, password_hash, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'stub@coffee.local',
  '$2b$10$stub.hash.placeholder',
  'USER'
)
ON CONFLICT (id) DO NOTHING;

SELECT id, stock
FROM products
ORDER BY created_at
LIMIT 2;
```

`productId` values used in checks:

- `dc09f798-5e60-4edd-bbc5-fc0980479767`
- `5c1836d3-fa20-438e-abfe-39f58fb5a6ff`

1) Create order (`201`):

```bash
curl -i -A 'PostmanRuntime/7.43.0' -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 11111111-1111-4111-8111-111111111111' \
  -d '{"items":[{"productId":"dc09f798-5e60-4edd-bbc5-fc0980479767","quantity":1},{"productId":"5c1836d3-fa20-438e-abfe-39f58fb5a6ff","quantity":2}]}'
```

2) Idempotency (`200` + same `order.id`):

```bash
curl -i -A 'PostmanRuntime/7.43.0' -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 11111111-1111-4111-8111-111111111111' \
  -d '{"items":[{"productId":"dc09f798-5e60-4edd-bbc5-fc0980479767","quantity":1},{"productId":"5c1836d3-fa20-438e-abfe-39f58fb5a6ff","quantity":2}]}'
```

3) Oversell (`201` + `409`):

```sql
UPDATE products
SET stock = 1
WHERE id = 'dc09f798-5e60-4edd-bbc5-fc0980479767';
```

Terminal A:

```bash
curl -i -A 'PostmanRuntime/7.43.0' -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 22222222-2222-4222-8222-222222222222' \
  -d '{"items":[{"productId":"dc09f798-5e60-4edd-bbc5-fc0980479767","quantity":1}]}'
```

Terminal B (immediately after A):

```bash
curl -i -A 'PostmanRuntime/7.43.0' -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 33333333-3333-4333-8333-333333333333' \
  -d '{"items":[{"productId":"dc09f798-5e60-4edd-bbc5-fc0980479767","quantity":1}]}'
```

Expected: one request returns `201`, the other returns `409`.

4) No partial writes (SQL checks):

```sql
SELECT id, user_id, idempotency_key
FROM orders
WHERE idempotency_key = '11111111-1111-4111-8111-111111111111';
```

```sql
SELECT id, order_id, product_id, quantity
FROM order_items
ORDER BY created_at DESC
LIMIT 10;
```

```sql
SELECT id, stock
FROM products
WHERE id IN (
  'dc09f798-5e60-4edd-bbc5-fc0980479767',
  '5c1836d3-fa20-438e-abfe-39f58fb5a6ff'
);
```

Expected result:

- in `orders`, for one `Idempotency-Key` there is exactly one row (or `0` for a rollback test case);
- in `order_items`, row count matches `items` in request;
- `products.stock` changes only after a successful order creation;
- duplicate/idempotency retry does not decrement stock again;
- `stock` never becomes negative.
