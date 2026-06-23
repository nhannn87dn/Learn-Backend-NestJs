# Zod Validation cho biến môi trường trong NestJS


## 1. Vì sao cần validate biến môi trường?

Biến môi trường thường chứa các cấu hình quan trọng như:

* `PORT`
* `NODE_ENV`
* `DB_HOST`
* `DB_PORT`
* `DB_NAME`
* `DB_USER`
* `DB_PASSWORD`
* `JWT_SECRET`

Nếu thiếu hoặc sai kiểu dữ liệu, ứng dụng có thể:

* Chạy lỗi khi deploy
* Kết nối sai database
* Dùng port không hợp lệ
* Chỉ phát hiện lỗi khi runtime, rất khó debug

Validate biến môi trường giúp ứng dụng **fail fast**: nếu config sai, app dừng ngay khi khởi động.

---

## 2. Zod là gì?

**Zod** là thư viện validate dữ liệu theo schema, được viết cho TypeScript.

Điểm mạnh của Zod:

* Dễ viết schema
* Có type inference tốt
* Không cần định nghĩa type lặp lại nhiều lần
* Phù hợp với TypeScript project

Ví dụ đơn giản:

```ts
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = schema.parse(process.env);
```

`z.coerce.number()` giúp chuyển chuỗi từ `.env` sang `number`.

---

## 3. Cài đặt

```bash
npm install zod
```

Nếu dự án dùng pnpm:

```bash
pnpm add zod
```

Nếu chưa cài `ConfigModule`:

```bash
npm install @nestjs/config
```

---

## 4. Cấu trúc thư mục đề xuất

```txt
src/
 ├── config/
 │    ├── app.config.ts
 │    ├── database.config.ts
 │    └── validation.schema.ts
 ├── app.module.ts
 └── main.ts
```

Ý nghĩa:

* `app.config.ts`: cấu hình chung của app
* `database.config.ts`: cấu hình database
* `validation.schema.ts`: gom schema và validate `process.env`

---

## 5. File `.env`

Ví dụ file `.env`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=nestjs_course
DB_USER=postgres
DB_PASSWORD=postgres
```

Lưu ý: mọi giá trị trong `.env` đều được đọc vào Node.js dưới dạng `string`.

Ví dụ:

```env
PORT=3000
```

Khi đọc bằng `process.env.PORT`, giá trị thực tế là:

```ts
'3000'
```

Vì vậy với Zod, ta thường dùng `z.coerce.number()` để ép kiểu.

---

## 6. Tạo app config

Nội dung file `src/config/app.config.ts`:

```ts
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export const appEnvSchema = {
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
};

export default registerAs('app', () => ({
  port: Number(process.env.PORT ?? 3000),
  env: process.env.NODE_ENV ?? 'development',
}));
```

Giải thích:

| Schema | Ý nghĩa |
| --- | --- |
| `z.coerce.number()` | Ép string từ `.env` sang number |
| `.int()` | Bắt buộc là số nguyên |
| `.positive()` | Bắt buộc lớn hơn 0 |
| `.default(3000)` | Nếu thiếu `PORT`, dùng mặc định 3000 |
| `z.enum([...])` | Chỉ cho phép một trong các giá trị đã khai báo |

---

## 7. Tạo database config

Nội dung file `src/config/database.config.ts`:

```ts
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export const databaseEnvSchema = {
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().int().positive(),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
};

export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  name: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
}));
```

Ở đây ta tách riêng:

* `databaseEnvSchema`: dùng để validate biến môi trường
* `registerAs('database', ...)`: dùng để tạo namespace config cho NestJS

Sau này có thể lấy config bằng:

```ts
const dbHost = this.configService.get<string>('database.host');
const dbPort = this.configService.get<number>('database.port');
```

---

## 8. Tạo validation schema

Với Joi, NestJS thường dùng option `validationSchema`.

Với Zod, ta nên dùng option `validate`.

Nội dung file `src/config/validation.schema.ts`:

```ts
import { z } from 'zod';
import { appEnvSchema } from './app.config';
import { databaseEnvSchema } from './database.config';

export const envSchema = z.object({
  ...appEnvSchema,
  ...databaseEnvSchema,
});

export type EnvSchema = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const parsedConfig = envSchema.safeParse(config);

  if (!parsedConfig.success) {
    const errors = parsedConfig.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return parsedConfig.data;
}
```

Giải thích:

| Thành phần | Ý nghĩa |
| --- | --- |
| `envSchema` | Schema tổng hợp cho toàn bộ biến môi trường |
| `z.infer<typeof envSchema>` | Tự sinh TypeScript type từ schema |
| `safeParse()` | Validate nhưng không throw ngay |
| `parsedConfig.success` | Cho biết validate thành công hay thất bại |
| `parsedConfig.error.issues` | Danh sách lỗi validate |

Nếu `.env` thiếu `DB_HOST`, app sẽ báo lỗi rõ ràng khi start.

Ví dụ lỗi:

```txt
Environment validation failed:
DB_HOST: DB_HOST is required
```

---

## 9. Sử dụng trong AppModule

Nội dung file `src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validate: validateEnv,
    }),
  ],
})
export class AppModule {}
```

Điểm khác so với Joi:

```ts
// Joi
ConfigModule.forRoot({
  validationSchema,
});
```

```ts
// Zod
ConfigModule.forRoot({
  validate: validateEnv,
});
```

---

## 10. Sử dụng ConfigService

Ví dụ trong service:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getConfig() {
    const port = this.configService.get<number>('app.port');
    const env = this.configService.get<string>('app.env');
    const dbHost = this.configService.get<string>('database.host');

    return {
      port,
      env,
      dbHost,
    };
  }
}
```

Ví dụ trong `main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);

  await app.listen(port, () => {
    console.log(`Application running at http://localhost:${port}`);
  });
}

bootstrap();
```

---

## 11. Gợi ý cải thiện type cho ConfigService

Để tránh gọi sai key config, có thể tạo type riêng cho app config.

Ví dụ file `src/config/config.type.ts`:

```ts
export type AppConfig = {
  app: {
    port: number;
    env: 'development' | 'production' | 'test';
  };
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
  };
};
```

Sử dụng:

```ts
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/config.type';

constructor(
  private readonly configService: ConfigService<AppConfig, true>,
) {}
```

Sau đó lấy config:

```ts
const port = this.configService.get('app.port', { infer: true });
const dbHost = this.configService.get('database.host', { infer: true });
```

Lợi ích:

* Gợi ý key tốt hơn trong IDE
* Giảm lỗi typo khi lấy config
* Type của giá trị trả về chính xác hơn

---

## 12. So sánh nhanh Joi và Zod

| Tiêu chí | Joi | Zod |
| --- | --- | --- |
| Tích hợp với ConfigModule | Dùng `validationSchema` trực tiếp | Dùng `validate` function |
| Type inference | Không mạnh bằng Zod | Rất tốt |
| Phong cách viết | Schema validation truyền thống | TypeScript-first |
| Ép kiểu `.env` | `Joi.number()` | `z.coerce.number()` |
| Phù hợp | Dự án NestJS truyền thống | Dự án ưu tiên TypeScript type-safety |

Không có lựa chọn tuyệt đối đúng cho mọi dự án.

* Nếu team đã quen Joi, dùng Joi vẫn ổn.
* Nếu muốn tận dụng TypeScript tốt hơn, Zod là lựa chọn rất tốt.

---

## 13. Bài tập thực hành

### Bài 1: Validate app config

Tạo schema Zod cho các biến:

```env
PORT=3000
NODE_ENV=development
```

Yêu cầu:

* `PORT` là number, mặc định `3000`
* `NODE_ENV` chỉ nhận `development`, `production`, `test`

### Bài 2: Validate database config

Tạo schema Zod cho:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nestjs_course
DB_USER=postgres
DB_PASSWORD=postgres
```

Yêu cầu:

* Các biến `DB_*` không được rỗng
* `DB_PORT` phải là số nguyên dương

### Bài 3: Test lỗi config

Xóa `DB_HOST` khỏi `.env`, sau đó chạy lại app.

Kỳ vọng:

```txt
Environment validation failed:
DB_HOST: DB_HOST is required
```

### Bài 4: Thêm JWT config

Thêm biến:

```env
JWT_SECRET=secret
JWT_EXPIRES_IN=1d
```

Yêu cầu:

* Tạo `jwt.config.ts`
* Tạo `jwtEnvSchema`
* Import vào `validation.schema.ts`
* Load vào `ConfigModule.forRoot()`
