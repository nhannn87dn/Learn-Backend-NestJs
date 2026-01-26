# Hướng dẫn chuẩn định dạng mã nguồn với Prettier & ESLint cho NodeJS TypeScript

## 1. Cài đặt các dependencies cần thiết

```bash
npm install -D prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier
```

**Giải thích các package:**
- `prettier`: Công cụ format code tự động
- `eslint`: Công cụ phân tích và tìm lỗi code
- `@typescript-eslint/parser`: Parser cho ESLint để hiểu TypeScript
- `@typescript-eslint/eslint-plugin`: Plugin ESLint cho TypeScript
- `eslint-config-prettier`: Tắt các rule ESLint xung đột với Prettier
- `eslint-plugin-prettier`: Chạy Prettier như một ESLint rule

## 2. Cấu hình Prettier

Tạo file `.prettierrc` hoặc `.prettierrc.json` ở thư mục root:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

Tạo file `.prettierignore` để bỏ qua các file không cần format:

```
node_modules
dist
build
coverage
*.log
.env
```

## 3. Cấu hình ESLint

Tạo file `.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": "warn"
  },
  "env": {
    "node": true,
    "es2022": true
  }
}
```

Tạo file `.eslintignore`:

```
node_modules
dist
build
coverage
*.config.js
```

## 4. Thêm scripts vào package.json

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\""
  }
}
```

## 5. Cấu hình VSCode (khuyên dùng)

Tạo file `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Cài đặt extension trong VSCode:
- ESLint (dbaeumer.vscode-eslint)
- Prettier - Code formatter (esbenp.prettier-vscode)

## 6. Sử dụng

**Format code:**
```bash
npm run format
```

**Kiểm tra lỗi lint:**
```bash
npm run lint
```

**Tự động fix lỗi lint:**
```bash
npm run lint:fix
```

## 7. Tích hợp với Git Hooks (tùy chọn)

Cài đặt Husky và lint-staged:

```bash
npm install -D husky lint-staged
npx husky init
```

Thêm vào `package.json`:

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

Tạo file `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

## Kết quả

Giờ đây mỗi khi bạn lưu file trong VSCode, code sẽ tự động được format theo chuẩn Prettier và kiểm tra lỗi bởi ESLint. Trước khi commit, Git hooks sẽ đảm bảo code đã được format và không có lỗi lint.