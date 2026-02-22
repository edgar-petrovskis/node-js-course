# Homework 07 — GraphQL for Orders + DataLoader

## 1) Chosen schema approach

**Approach:** `schema-first`.

### Why

- Less cognitive load, schema allows to separate Entities from GraphQL
- Type generation is enabled via `GraphQLModule.definitions`, so transport types stay aligned with schema.

---

## 2) Where business logic lives

Business logic remains in the application layer:

- `src/application/orders/orders.service.ts`
  - transactional `createOrder` flow (idempotency, stock checks, DB transaction).
- `src/application/orders/orders-query.service.ts`
  - read-side logic for `orders` query:
    - filter processing (`status`, `dateFrom`, `dateTo`),
    - cursor pagination (`first`, `after`, `last`, `before`),
    - connection response shaping (`nodes`, `totalCount`, `pageInfo`).

GraphQL resolvers:

- `src/interfaces/graphql/orders.resolver.ts`
  - delegates `Query.orders` to `OrdersQueryService`.
  - resolves `OrderItem.product` through `ProductLoader`.

---

## 3) DateTime decision (vs String)

Decision: use **GraphQL `DateTime` scalar**, not `String`, for date filters.

### Implementation

- SDL declares `scalar DateTime`.
- Runtime scalar is mapped via:
  - `DateTime: GraphQLISODateTime` in GraphQL module config.
- DTO validation for GraphQL args validates date values as `Date` objects.

---

## 4) Pagination format

Chosen format: **Connection-style cursor pagination**.

### Contract

- `OrdersConnection { nodes, totalCount, pageInfo }`
- `PageInfo { hasNextPage, hasPreviousPage, startCursor, endCursor }`
- `OrdersPaginationInput { first, after, last, before }`

### Why

- Supports stable forward/backward navigation.
- More scalable than offset-only pagination semantics.

---

## 5) DataLoader implementation

`ProductLoader` is implemented as a **request-scoped** GraphQL adapter:

- File: `src/interfaces/graphql/loaders/product.loader.ts`
- Uses `dataloader` package.
- Batches product IDs into a single DB query:
  - `WHERE id IN (...)`
- Preserves key order when mapping results.
- Provides per-request caching.

`OrderItem.product` resolution uses:

- `return this.productLoader.load(item.productId);`

---

## 6) N+1 proof (before / after)

### Before DataLoader

Observed pattern for `orders -> items -> product`:

- 1 query for `orders + order_items`
- N separate queries for `products` (`WHERE id = $1 LIMIT 1`)

This is classic N+1 behavior.

##### Request

```bash
curl -s http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"query { orders(pagination: { first: 2 }) { nodes { id items { id product { id title priceCents } } } } }"}'

```

##### Log Before

```sql
query: SELECT "order"."id" AS "order_id",
    "order"."user_id" AS "order_user_id",
    "order"."status" AS "order_status",
    "order"."total_amount_cents" AS "order_total_amount_cents",
    "order"."currency" AS "order_currency",
    "order"."idempotency_key" AS "order_idempotency_key",
    "order"."created_at" AS "order_created_at",
    "order"."updated_at" AS "order_updated_at",
    "item"."id" AS "item_id",
    "item"."order_id" AS "item_order_id",
    "item"."product_id" AS "item_product_id",
    "item"."quantity" AS "item_quantity",
    "item"."price_at_purchase_cents" AS "item_price_at_purchase_cents",
    "item"."currency" AS "item_currency",
    "item"."created_at" AS "item_created_at"
FROM "orders" "order"
    LEFT JOIN "order_items" "item" ON "item"."order_id" = "order"."id"
ORDER BY "order"."created_at" DESC,
    "order"."id" DESC
query: SELECT "Product"."id" AS "Product_id",
    "Product"."title" AS "Product_title",
    "Product"."description" AS "Product_description",
    "Product"."price_cents" AS "Product_price_cents",
    "Product"."currency" AS "Product_currency",
    "Product"."stock" AS "Product_stock",
    "Product"."is_active" AS "Product_is_active",
    "Product"."created_at" AS "Product_created_at",
    "Product"."updated_at" AS "Product_updated_at"
FROM "products" "Product"
WHERE (("Product"."id" = $1))
LIMIT 1 -- PARAMETERS: ["dc09f798-5e60-4edd-bbc5-fc0980479767"]
query: SELECT "Product"."id" AS "Product_id",
    "Product"."title" AS "Product_title",
    "Product"."description" AS "Product_description",
    "Product"."price_cents" AS "Product_price_cents",
    "Product"."currency" AS "Product_currency",
    "Product"."stock" AS "Product_stock",
    "Product"."is_active" AS "Product_is_active",
    "Product"."created_at" AS "Product_created_at",
    "Product"."updated_at" AS "Product_updated_at"
FROM "products" "Product"
WHERE (("Product"."id" = $1))
LIMIT 1 -- PARAMETERS: ["dc09f798-5e60-4edd-bbc5-fc0980479767"]
query: SELECT "Product"."id" AS "Product_id",
    "Product"."title" AS "Product_title",
    "Product"."description" AS "Product_description",
    "Product"."price_cents" AS "Product_price_cents",
    "Product"."currency" AS "Product_currency",
    "Product"."stock" AS "Product_stock",
    "Product"."is_active" AS "Product_is_active",
    "Product"."created_at" AS "Product_created_at",
    "Product"."updated_at" AS "Product_updated_at"
FROM "products" "Product"
WHERE (("Product"."id" = $1))
LIMIT 1 -- PARAMETERS: ["5c1836d3-fa20-438e-abfe-39f58fb5a6ff"]
```

### After DataLoader

Observed pattern for the same GraphQL query:

- 1 query for `orders + order_items`
- 1 batched query for products:
  - `WHERE id IN ($1, $2, ...)`

Result: N+1 removed for `OrderItem.product`.

##### Request

```bash
curl -s http://localhost:3000/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"query { orders(pagination: { first: 2 }) { nodes { id items { id product { id title priceCents } } } } }"}'

```

##### Log After

```sql
query: SELECT "order"."id" AS "order_id",
    "order"."user_id" AS "order_user_id",
    "order"."status" AS "order_status",
    "order"."total_amount_cents" AS "order_total_amount_cents",
    "order"."currency" AS "order_currency",
    "order"."idempotency_key" AS "order_idempotency_key",
    "order"."created_at" AS "order_created_at",
    "order"."updated_at" AS "order_updated_at",
    "item"."id" AS "item_id",
    "item"."order_id" AS "item_order_id",
    "item"."product_id" AS "item_product_id",
    "item"."quantity" AS "item_quantity",
    "item"."price_at_purchase_cents" AS "item_price_at_purchase_cents",
    "item"."currency" AS "item_currency",
    "item"."created_at" AS "item_created_at"
FROM "orders" "order"
    LEFT JOIN "order_items" "item" ON "item"."order_id" = "order"."id"
ORDER BY "order"."created_at" DESC,
    "order"."id" DESC
query: SELECT "Product"."id" AS "Product_id",
    "Product"."title" AS "Product_title",
    "Product"."description" AS "Product_description",
    "Product"."price_cents" AS "Product_price_cents",
    "Product"."currency" AS "Product_currency",
    "Product"."stock" AS "Product_stock",
    "Product"."is_active" AS "Product_is_active",
    "Product"."created_at" AS "Product_created_at",
    "Product"."updated_at" AS "Product_updated_at"
FROM "products" "Product"
WHERE (("Product"."id" IN ($1, $2))) -- PARAMETERS: ["dc09f798-5e60-4edd-bbc5-fc0980479767","5c1836d3-fa20-438e-abfe-39f58fb5a6ff"]
```

---

## 7) Error handling and validation

### Validation for GraphQL args

- Implemented DTO validation for:
  - `OrdersFilterArgsDto`
  - `OrdersPaginationArgsDto`
- Resolver applies `ValidationPipe` on GraphQL args.

Examples verified:

- `first: 0` -> validation error
- invalid `dateFrom` -> validation error
- future `dateFrom` with no matches -> valid response with empty list

### GraphQL-safe exception flow

- `HttpExceptionFilter` now handles only HTTP context.
- Non-HTTP contexts (GraphQL) rethrow exception to GraphQL error pipeline.

---

## 8) Example verification query

```graphql
query OrdersPage($first: Int, $after: String) {
  orders(pagination: { first: $first, after: $after }) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    nodes {
      id
      status
      createdAt
      items {
        id
        productId
        product {
          id
          title
          priceCents
        }
      }
    }
  }
}
```
