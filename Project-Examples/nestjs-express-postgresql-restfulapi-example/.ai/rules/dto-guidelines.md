# DTO Guidelines

## General

- ALWAYS separate request and response DTO

---

## Request DTO

Used for:
- create
- update
- query params

Examples:
CreateProductDto
UpdateProductDto

---

## Response DTO

MUST split:

### Admin
AdminProductResponseDto

- includes all fields

### Public
PublicProductResponseDto

- excludes:
  - cost
  - internal fields

---

## Rule

❌ NEVER reuse Entity as response

❌ NEVER use 1 DTO for all contexts

✅ ALWAYS map Entity → DTO