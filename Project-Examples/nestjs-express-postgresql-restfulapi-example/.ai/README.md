# AI Guidelines for NestJS with Express and PostgreSQL

Cấu trúc file để hướng dẫn AI về cách tổ chức mã nguồn, thiết kế API, và các quy tắc đặt tên trong dự án NestJS với Express và PostgreSQL. Dưới đây là cấu trúc thư mục đề xuất cho phần `.ai` chứa các tài liệu hướng dẫn và quy tắc:

```
.ai/
├── AI_SYSTEM.md
│
├── rules/
│   ├── api-design.md
│   ├── folder-structure.md
│   ├── dto-guidelines.md
│   ├── naming-convention.md
│
├── context/
│   ├── project-overview.md
│   ├── tech-stack.md
│
├── prompts/
│   ├── create-module.md
│   ├── create-endpoint.md
│   ├── create-bff.md
```


Dưới đây là **bộ ví dụ prompt chuẩn** để bạn dùng với `.ai/` trong project (NestJS e-commerce của bạn).
Tôi sắp xếp theo **tình huống thực tế** + **mức độ dùng hàng ngày → nâng cao** để bạn copy dùng ngay trong VSCode (Cursor, Claude…).

---


## 🧩 Tạo module mới (user, product…)

```txt id="p1"
Read .ai/AI_SYSTEM.md

Use .ai/prompts/create-module.md
moduleName=user
```

---

## 🔌 Tạo endpoint admin

```txt id="p2"
Read .ai/rules/api-design.md

Use .ai/prompts/create-endpoint.md

moduleName=user
type=admin

Requirement:
- CRUD full user
```

---

## 🌐 Tạo endpoint public

```txt id="p3"
Read .ai/rules/api-design.md

Use .ai/prompts/create-endpoint.md

moduleName=product
type=public

Requirement:
- GET /products
- GET /products/:slug
- Only return published products
```

---

# 🟡 🧠 2. Prompt chuẩn team (khuyến nghị dùng)

## 🧩 Tạo module + business rule

```txt id="p4"
Read .ai/AI_SYSTEM.md

Use .ai/prompts/create-module.md

moduleName=user

Business rules:
- User has: id, email, password, name, role, isActive
- Admin can CRUD users
- Public only view profile

Constraints:
- NEVER return password
```

---

## 📊 Tạo DTO đúng chuẩn

```txt id="p5"
Read .ai/rules/dto-guidelines.md

Create DTO for user module:

- CreateUserDto
- UpdateUserDto
- AdminUserResponseDto
- PublicUserResponseDto

Rules:
- Separate request/response
- Do not expose password
```

---

## 🗄️ Tạo repository chuẩn

```txt id="p6"
Read .ai/rules/folder-structure.md

Create users.repository.ts

Requirements:
- findAll
- findById
- findByEmail
- create
```

---

# 🔴 🚀 3. Prompt nâng cao (pro workflow)

## 🧱 Tạo module giống module có sẵn (tiết kiệm token nhất)

```txt id="p7"
Follow the same structure as product module

Create user module
```

👉 Đây là cách **xịn nhất** vì:

* không cần load rule
* AI copy pattern chuẩn

---

## 🔄 Refactor module theo rule

```txt id="p8"
Read .ai/rules/folder-structure.md

Refactor users module to match standard structure:

- controllers/
- services/
- dto/
- repositories/
- entities/
```

---

## 🔐 Thêm auth vào user

```txt id="p9"
Read .ai/AI_SYSTEM.md

Extend user module with authentication:

- hash password before save
- exclude password from response
- integrate with auth module
```

---

# 🏠 🧩 4. Prompt cho BFF (homepage)

```txt id="p10"
Read .ai/prompts/create-bff.md

Create homepage API:

GET /home

Include:
- newProducts (limit 5)
- featuredProducts
```

---

# ⚙️ 🧪 5. Prompt cho query (filter, sort, pagination)

```txt id="p11"
Read .ai/rules/api-design.md

Add query support for product:

- search by name
- sort by createdAt desc
- pagination page/limit
```

---

# 🧠 🔥 6. Prompt tối ưu token (rất quan trọng)

## 👉 Dùng summary rule

```txt id="p12"
Read .ai/rules/_summary.md

Create product endpoint
```

---

## 👉 Không load rule, dùng pattern

```txt id="p13"
Follow existing modules pattern

Create order module
```

---

# ⚠️ ❌ 7. Prompt sai (tránh dùng)

## ❌ Quá chung chung

```txt id="p14"
Create user API
```

---

## ❌ Load toàn bộ rule (tốn token)

```txt id="p15"
Read all files in .ai/
```

---

# ✅ 🎯 8. Công thức prompt chuẩn (bạn nên nhớ)

👉 Mỗi prompt tốt nên có:

```txt id="p16"
1. Context (Read rule / system)
2. Template (Use prompt file)
3. Business requirement
4. Constraint (security / logic)
```

---

# 💡 Ví dụ hoàn chỉnh (best practice)

```txt id="p17"
Read .ai/AI_SYSTEM.md

Use .ai/prompts/create-module.md

moduleName=user

Business rules:
- id, email, password, name, role
- role: admin | customer

API:
- Admin CRUD
- Public profile

Constraints:
- NEVER return password
- Follow DTO rules
```

---

# 🏁 Kết luận

👉 Bạn nên dùng theo level:

* 🟢 Hàng ngày: dùng template + rule nhẹ
* 🟡 Khi build feature: thêm business rule
* 🔴 Khi project lớn: dùng pattern (anchor module)

---

# 🚀 Nếu bạn muốn đi xa hơn

Tôi có thể build thêm cho bạn:

* 🔹 Prompt cho full flow e-commerce (cart → order → payment)
* 🔹 Prompt cho RBAC (role-based access)
* 🔹 Prompt cho cache Redis + performance

👉 chỉ cần nói: **“tạo prompt cho order/cart flow”** 👍
