
# 3. Password Hashing

## 3.1 Hash là gì?

**Hash** là quá trình biến đổi một dữ liệu đầu vào (bất kỳ kích thước) thành một chuỗi cố định thông qua một hàm toán học, đặc điểm:

- **Một chiều**: Không thể từ hash ngược lại ra mật khẩu gốc
- **Deterministic**: Cùng input → luôn ra cùng output
- **Avalanche effect**: Thay đổi nhỏ ở input → output thay đổi hoàn toàn
- **Collision resistant**: Rất khó tìm 2 input có cùng hash

```
"password123" → bcrypt → "$2b$10$N9qo8uLOickgx..."
"password124" → bcrypt → "$2b$10$Xk7mP2aQn1..."  ← hoàn toàn khác
```

## 3.2 Hash vs Encryption

| | Hash | Encryption |
|---|---|---|
| Chiều | Một chiều (không đảo ngược) | Hai chiều (có thể giải mã) |
| Mục đích | Xác minh tính toàn vẹn | Bảo mật dữ liệu, cần khôi phục |
| Ví dụ | Lưu mật khẩu | Mã hóa tin nhắn, truyền dữ liệu |
| Thuật toán | bcrypt, SHA-256, argon2 | AES, RSA |

> **Lưu ý quan trọng:** Mật khẩu **phải** được hash, không bao giờ được encrypt vì có thể decrypt ra.

## 3.3 Salt

**Salt** là một chuỗi ngẫu nhiên được thêm vào mật khẩu trước khi hash, giúp chống lại **Rainbow Table Attack** (tấn công dùng bảng hash được tính sẵn).

```
password: "abc123"
salt: "randomstring"
hash("abc123" + "randomstring") → "$2b$10$..."
```

Mỗi user có một salt khác nhau → dù 2 user cùng mật khẩu, hash vẫn khác nhau.

## 3.4 bcrypt

**bcrypt** là thuật toán hash mật khẩu phổ biến nhất, có **cost factor** điều chỉnh độ khó.

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

```typescript
import * as bcrypt from 'bcrypt';

// Hash mật khẩu
const saltRounds = 10; // cost factor
const hashedPassword = await bcrypt.hash('myPassword', saltRounds);
// "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

// Verify mật khẩu
const isMatch = await bcrypt.compare('myPassword', hashedPassword);
// true
```

> **Cost factor = 10** là khuyến nghị cho hầu hết ứng dụng. Tăng lên để tăng bảo mật, nhưng sẽ chậm hơn.

## 3.5 argon2

**argon2** là thuật toán hash hiện đại hơn, được khuyến nghị bởi Password Hashing Competition (PHC). Có 3 biến thể: `argon2i`, `argon2d`, `argon2id` (khuyến nghị dùng `argon2id`).

```bash
npm install argon2
```

```typescript
import * as argon2 from 'argon2';

// Hash mật khẩu
const hashedPassword = await argon2.hash('myPassword');

// Verify
const isMatch = await argon2.verify(hashedPassword, 'myPassword');
// true
```

> argon2 được khuyến nghị hơn bcrypt cho các ứng dụng mới vì có khả năng chống GPU/ASIC attack tốt hơn.
