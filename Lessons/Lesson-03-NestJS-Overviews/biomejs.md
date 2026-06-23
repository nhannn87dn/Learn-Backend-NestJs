# Chuẩn định dạng hoá mã nguồn với BiomeJS (Node.js + TypeScript)


> BiomeJS = công cụ **thay thế ESLint + Prettier**, nhanh hơn, cấu hình gọn hơn.


## 1. BiomeJS là gì? Vì sao nên dùng?


### 1.1 BiomeJS là gì?

BiomeJS là một tool all-in-one:

* ✅ Formatter (thay Prettier)
* ✅ Linter (thay ESLint)
* ✅ Analyzer
* ⚡ Viết bằng Rust → **rất nhanh**

👉 Một tool duy nhất, **1 file config**, không plugin rối rắm.

---

### 1.2 So sánh Biome vs ESLint + Prettier

| Tiêu chí          | ESLint + Prettier | BiomeJS     |
| ----------------- | ----------------- | ----------- |
| Cấu hình          | Phức tạp          | Đơn giản    |
| Plugin            | Nhiều             | Không cần   |
| Tốc độ            | Trung bình        | ⚡ Rất nhanh |
| Trùng rule        | Có                | Không       |
| Học cho người mới | Khó               | Dễ          |

👉 Với project **Node.js / NestJS mới**, BiomeJS là lựa chọn rất tốt.

---

## 2. Cài đặt BiomeJS – Step by Step

### Bước 1: Cài BiomeJS

```bash
npm install --save-dev @biomejs/biome
```

---

### Bước 2: Khởi tạo config

```bash
npx biome init
```

👉 Tạo file:

```
biome.json
```

---

## 3. Cấu hình chuẩn `biome.json` cho Node.js + TypeScript

### 3.1 Config khuyến nghị (production-ready)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.7.0/schema.json",

  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      "coverage"
    ]
  },

  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },

  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },

  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  },

  "typescript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  }
}
```

---

### 3.2 Giải thích nhanh (để giảng cho học viên)

* `indentWidth: 2` → chuẩn Node/NestJS
* `lineWidth: 100` → dễ đọc backend
* `single quote` → phổ biến trong TS
* `semicolons: always` → tránh bug JS
* `recommended: true` → bật rule an toàn

---

## 4. Thêm script vào `package.json`

```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format .",
    "check": "biome check .",
    "check:fix": "biome check . --apply"
  }
}
```

### Ý nghĩa

| Script    | Tác dụng       |
| --------- | -------------- |
| lint      | Check lỗi code |
| format    | Format code    |
| check     | Lint + format  |
| check:fix | Tự fix         |

---

## 5. Ví dụ trước & sau khi format

### ❌ Code bẩn

```ts
export  class UserService{
constructor(private readonly repo:any){}
findAll( ){
return this.repo.find()
}
}
```

---

### ✅ Sau khi chạy Biome

```ts
export class UserService {
  constructor(private readonly repo: any) {}

  findAll() {
    return this.repo.find();
  }
}
```

👉 **Không cần chỉnh tay**

---

## 6. Chuẩn ignore cho backend project

Không format/lint các thư mục build:

```json
"files": {
  "ignore": ["dist", "build", "node_modules"]
}
```

👉 Rất quan trọng khi deploy

---

## 7. Tích hợp BiomeJS với VS Code (RẤT NÊN)

### Bước 1: Cài extension

* **Biome** (by biomejs)

---

### Bước 2: Cấu hình VS Code

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome"
}
```

👉 Save là auto format

---

## 8. Dùng BiomeJS cho NestJS có ổn không?

✅ Hoàn toàn ổn:

* Controller
* Service
* DTO
* Guard
* Pipe

❗ Lưu ý:

* Biome **không thay thế** `class-validator`
* Biome **không thay thế** TypeScript type checking (`tsc`)

👉 Vẫn cần:

```bash
npm run build
```

---

## 9. Best Practice cho team / học viên

> **Biome lo format & lint**
> **TypeScript lo type**
> **class-validator lo validate dữ liệu**

Không trùng trách nhiệm.

---

## 10. Chuẩn đề xuất cho khóa học / tutorial của bạn

* ESLint + Prettier ❌ (rối cho người mới)
* **BiomeJS ✅**
* Ít config
* Dễ hiểu
* Thực tế

---
