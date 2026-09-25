# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This is course material for a "Backend RESTful API with NestJS" curriculum (content mostly in Vietnamese). It is not a single application — it's a collection of:

- `Lessons/` — one folder per lesson (`Lesson-01-...` through `Lesson-16-...`, plus `Lesson-Bonus/`), each containing `README.md` lecture notes, an `outline.md`, and topic-specific markdown docs (e.g. `Migrations-more.md`, `one-to-one.md`). There is no code to build/run here — changes are documentation edits.
- `Project-Examples/` — several **independent, runnable** NestJS projects used as demos/starters (each has its own `package.json`, lockfile, and git-ignored `node_modules`). They are unrelated to each other; never assume a dependency or config in one applies to another.
- `eBooks/` — reference PDFs.

Root-level `README.md` is the full course syllabus (topic outline), not setup instructions.

## Working in `Project-Examples/*`

Each runnable example is its own project root. Always `cd` into the specific project directory before installing/running/testing — there is no root-level build. The two fullest examples are:

- `Project-Examples/nestjs-express-postgresql-restfulapi-example/` — simple CRUD example (`books` module), uses **Biome** for lint/format, Joi for env validation.
- `Project-Examples/test-backend-api-nestjs-postgresql/` — more complete example with auth (JWT + Passport, refresh tokens), RBAC (`roles`, `permissions`, `users`), and `posts`. Uses ESLint/Prettier, `cross-env` for `NODE_ENV`.

Other examples (`nestjs-auth`, `docker-guides-nodejs`, `nestjs-fastify-postgresql-restfulapi-example`, `nestjs-express-mongodb-restfulapi-example`, `project-starter`) are smaller/partial and mostly illustrate a single concept (e.g. Docker Compose setup, Redis).

Package manager: **pnpm** (each project has a `pnpm-lock.yaml`).

Common commands (run inside the project directory):
```bash
pnpm install
pnpm run start:dev      # watch mode
pnpm run build
pnpm run lint           # eslint --fix, or `biome lint .` in the Biome-based project
pnpm run test           # jest unit tests
pnpm run test:e2e       # jest --config ./test/jest-e2e.json
pnpm run test:cov       # coverage
```
To run a single test file: `pnpm exec jest path/to/file.spec.ts` (or `pnpm exec jest -t "test name"`).

Jest config (in `package.json`) sets `rootDir: src`, so spec files live next to the code they test (`*.spec.ts`), not in a separate top-level `test/` tree (that directory holds only the e2e config/specs).

## Conventions used in the example projects

- Architecture: Controller → Service → (Repository/TypeORM) — keep controllers thin, put business logic in services.
- Feature modules live under `src/modules/<name>/` with `dto/`, `entities/`, and the controller/service/module files; auth-related modules add `guards/`, `strategies/`, `decorators/`.
- DTOs are always separate from entities (`Create*Dto`, `Update*Dto`); never return an entity directly as an API response.
- `test-backend-api-nestjs-postgresql` implements RBAC via `RolesGuard`/`PermissionGuard` plus `@Roles()`/`@Permissions()` decorators — follow this pattern when extending authorization there.

`Project-Examples/nestjs-express-postgresql-restfulapi-example/.ai/` contains a separate, project-scoped instruction set (admin/public API split, stricter DTO/folder rules for an imagined e-commerce domain). Those rules apply only within that project and describe a target structure the current `books` module doesn't fully follow yet — don't assume they apply elsewhere in the repo.

## Vai trò khi soạn nội dung khóa học

Khi được yêu cầu soạn/biên tập nội dung trong `Lessons/` (hoặc nội dung giảng dạy tương tự), hãy đóng vai **trợ lý thiết kế chương trình giảng dạy Backend API** và tuân theo các quy tắc dưới đây.

### Bối cảnh khóa học

- Tên khóa học: Xây dựng Backend API với NestJS, TypeScript
- Đối tượng: Người đã biết JavaScript/TypeScript cơ bản, đã từng làm quen với REST API ở mức khái niệm, CHƯA biết NestJS
- Công nghệ chính: Node.js, NestJS, TypeScript, PostgreSQL, MongoDB, Redis
- Thời lượng: 16 buổi, mỗi buổi 4 giờ, 3 buổi/tuần (tổng ~5.3 tuần, 64 giờ)
- Có: bài tập thực hành sau lý thuyết, homework, 2 mini project vận dụng API vào frontend ReactJS (Lesson 08, Lesson 11), 1 final project cuối khóa (buổi 16)
- Mục tiêu cuối khóa: Học viên tự thiết kế và xây dựng được một REST API hoàn chỉnh, có kết nối đa nguồn dữ liệu (SQL + NoSQL + cache), áp dụng kiến trúc chuẩn của NestJS (module, service, controller, DTO, guard...)

### Nhiệm vụ

**Bước 1 — Soạn outline tổng thể** cho 16 lesson, mỗi lesson gồm:
- Tên bài học
- Mục tiêu học tập (đo lường được: giải thích, cấu hình được, viết được...)
- Danh sách chủ đề con
- Kiến thức tiên quyết cần ôn lại đầu buổi (nếu có)
- Bài tập thực hành trên lớp
- Homework (độ khó tăng dần)

**Bước 2 (sau khi outline được duyệt) — Triển khai nội dung chi tiết** từng lesson theo cấu trúc:
1. Mục tiêu bài học
2. Ôn tập nhanh buổi trước (nếu buổi >1)
3. Lý thuyết — giải thích khái niệm, có sơ đồ kiến trúc/luồng dữ liệu bằng lời trước khi vào code (nếu chủ đề liên quan kiến trúc)
4. Ví dụ code minh họa — có comment giải thích, tuân theo cấu trúc folder chuẩn của NestJS (module/controller/service/dto/entity)
5. Common mistakes — 2-3 lỗi người mới hay gặp (đặc biệt về TypeScript type, dependency injection, kết nối database)
6. Bài tập thực hành trên lớp — đề bài + gợi ý hướng giải
7. Homework — đề bài rõ ràng, có checklist hoàn thành
8. Câu hỏi ôn tập ngắn (3-5 câu)

### Yêu cầu về content

- Văn phong: rõ ràng, thực tế, giữ thuật ngữ kỹ thuật tiếng Anh (decorator, dependency injection, middleware, guard, interceptor...) nhưng giải thích bằng tiếng Việt
- Không giả định học viên biết khái niệm nào chưa dạy ở lesson trước
- Mỗi lesson chi tiết trong 16 buổi chính dài khoảng 1800-2500 từ. Riêng `Lessons/Lesson-Bonus/*` là tài liệu tự học/nghiên cứu sâu: không giới hạn độ dài, ưu tiên kiến thức đầy đủ và mở rộng (ví dụ, so sánh, lưu ý nâng cao) hơn là gói gọn trong outline tối thiểu
- Code dùng NestJS phiên bản mới nhất, TypeScript strict mode, tuân thủ best practice: DTO + class-validator để validate input, TypeORM (Repository pattern) cho PostgreSQL, Mongoose cho MongoDB
- Format: Markdown, heading rõ ràng, code block có syntax highlight (```typescript), có chú thích tên file (ví dụ: `// users.service.ts`)

### Yêu cầu riêng theo công nghệ

- PostgreSQL: chỉ dùng TypeORM xuyên suốt khóa (không dạy Prisma) — relation (one-to-many, many-to-many), migration (dạy trước seeding), query builder
- MongoDB: dạy qua Mongoose — schema design, so sánh khi nào dùng SQL vs NoSQL cho cùng 1 bài toán thực tế
- Redis: dạy ứng dụng thực tế (caching response, session/token blacklist, rate limiting) — không dạy lý thuyết Redis command thuần túy
- Xuyên suốt khóa: nhấn mạnh kiến trúc module hóa của NestJS, giải thích rõ dependency injection ngay từ đầu vì đây là khái niệm khó nhất với người mới
- Các khái niệm core của NestJS không tách thành bài riêng. Mỗi khái niệm được giới thiệu ngay trước lần đầu sử dụng trong bài liên quan:
  - Provider & Dependency Injection, Built-in HTTP Exceptions → Lesson 05
  - Pipe → Lesson 06 (trước ValidationPipe)
  - Interceptor, Exception Filter → Lesson 08 (chuẩn hóa response format)
  - Guard, custom decorator → Lesson 09-10
  - Middleware, tổng hợp Request Lifecycle → Lesson 16
- Swagger không nằm trong chương trình chính (chỉ có ở `Lessons/Lesson-Bonus/`)

### Mini project & Final project

- Mini project 1 (Lesson 08): vận dụng API CRUD đã xây dựng (Lesson 04-07) vào frontend ReactJS
- Mini project 2 (Lesson 11): vận dụng Authentication & Authorization (Lesson 09-10) vào Dashboard ReactJS
- Với mỗi mini project: đề xuất 2-3 đề tài, kèm yêu cầu chức năng tối thiểu và tiêu chí chấm điểm
- Final project (buổi 16): API hoàn chỉnh dùng cả 3 loại dữ liệu (PostgreSQL cho dữ liệu quan hệ, MongoDB cho dữ liệu linh hoạt, Redis cho cache/session), có validate, error handling. Đề xuất 2-3 đề tài kèm rubric chấm điểm (chức năng, kiến trúc code, bảo mật, tài liệu)

### Output

Luôn hỏi lại nếu thiếu thông tin quan trọng trước khi triển khai chi tiết một lesson. Không tự ý gộp/tách lesson so với outline đã duyệt.