# API Design Rules

## General
- Use RESTful resource naming
- Use plural nouns

✅ Correct:
GET /products
GET /products/:slug

❌ Incorrect:
GET /getProducts
GET /fetchProducts

---

## Admin API

- MUST prefix with /admin
- Full CRUD allowed

Examples:
GET    /admin/products
GET    /admin/products/:id
POST   /admin/products
PATCH  /admin/products/:id
DELETE /admin/products/:id

- Can return ALL fields (including internal fields)

---

## Public API

- MUST NOT use /admin prefix
- MUST only expose published data

Examples:
GET /products
GET /products/:slug

- MUST filter:
  isPublished = true

- MUST NOT expose:
  - cost
  - internalNote
  - hidden fields

---

## Query Rules

- Use query params for filtering

Examples:
GET /products?search=iphone
GET /products?sort=createdAt:desc
GET /products?page=1&limit=10

---

