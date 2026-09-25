# Lesson 11 - Build a Dashboard with ReactJS

> Mini project: vận dụng Authentication & Authorization (Lesson 09-10) vào một frontend Dashboard thật.

## Mục tiêu bài học

* Xây dựng giao diện Dashboard cơ bản với ReactJS
* Kết nối giao diện với API Authentication/Authorization của NestJS (Lesson 09-10)
* Bảo vệ route ở phía frontend dựa trên trạng thái đăng nhập và role/permission của user

## Ôn tập nhanh buổi trước

Lesson 09-10 đã xây xong API `/auth/login`, `/auth/refresh`, Guard kiểm tra JWT (`JwtAuthGuard`) và Guard kiểm tra role/permission (`RolesGuard`, `PermissionsGuard`). Bài này dùng đúng các API đó từ phía ReactJS — quan trọng: **bảo vệ route ở frontend chỉ là UX** (ẩn/hiện, điều hướng), quyền truy cập **thật sự** vẫn luôn do Guard ở backend quyết định. Đừng nhầm lẫn "ẩn nút bấm trên UI" với "bảo mật API".

## Init dự án ReactJS (phục vụ demo API)

* Khởi tạo ReactJS bằng Vite
* Cấu trúc tối thiểu cho CRUD
* Các package cần thiết
  * React Router v7
  * Axios + Axios Instance + interceptors
  * React Query
  * Shadcn UI
  * React Hook Form + Zod
  * Zustand

## Kết nối ReactJS với API NestJS

* Client – Server trong REST API
* Axios instance
* Service layer gọi API

### Axios Instance dùng chung, tự động đính kèm token

```typescript
// src/lib/axios.ts
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

## Xây dựng giao diện Login

* Form đăng nhập
* Xử lý xác thực người dùng
* Gửi yêu cầu đăng nhập
* Lưu trữ token JWT

```typescript
// src/pages/LoginPage.tsx (rút gọn)
async function handleSubmit(values: { email: string; password: string }) {
  const { data } = await api.post('/auth/login', values);
  // data.data vì response đã được TransformInterceptor bọc (xem Lesson 08)
  useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
  navigate('/dashboard');
}
```

> Lưu ý bảo mật: lưu `accessToken` trong bộ nhớ (state/store), không lưu trong `localStorage` nếu ứng dụng có nguy cơ XSS — `refreshToken` nên được backend set qua `httpOnly cookie` khi có thể, tránh lộ token cho JavaScript đọc được.

## Cấu hình bảo vệ route private

* Tạo Private Route với React Router
* Chuyển hướng người dùng chưa đăng nhập về trang Login

```tsx
// src/routes/PrivateRoute.tsx
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

```tsx
// src/App.tsx
<Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
```

## Xây dựng giao diện Dashboard

* Giao diện chính Dashboard
* Hiển thị các thông tin tổng quan

## Hiển thị thông tin người dùng (User Profile)

* Giao diện hiển thị thông tin người dùng
* Đổi mật khẩu
* Cập nhật thông tin cá nhân

```typescript
// Gọi API GET /auth/profile (được bảo vệ bởi JwtAuthGuard, xem Lesson 09)
const { data } = await api.get('/auth/profile');
setProfile(data.data);
```

## Chức năng đăng xuất

* Xử lý đăng xuất
* Xoá token khỏi client

```typescript
function handleLogout() {
  useAuthStore.getState().clearTokens();
  navigate('/login');
}
```

## Chức năng phân quyền người dùng

* Phân nhóm người dùng (roles)
* Gán permission cho các roles
* Phân quyền truy cập vào các route và chức năng trong Dashboard

Backend (Lesson 10) đã trả về `role`/`permissions` trong payload JWT hoặc qua `/auth/profile`. Ở frontend, dùng thông tin đó để **ẩn/hiện** phần UI tương ứng — nhắc lại: đây chỉ là UX, API vẫn phải tự bảo vệ bằng `RolesGuard`/`PermissionsGuard`.

```tsx
function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== role) return null; // không render nếu sai role
  return <>{children}</>;
}

// Sử dụng: chỉ admin mới thấy menu Quản lý người dùng
<RequireRole role="admin">
  <MenuItem to="/dashboard/users">Quản lý người dùng</MenuItem>
</RequireRole>
```

## Chức năng quên mật khẩu

* Giao diện quên mật khẩu
* Gửi email đặt lại mật khẩu
* Cập nhật mật khẩu mới

Flow tương tự các bước ở Lesson 14 (Send mail): người dùng nhập email → gọi `POST /auth/forgot-password` → backend gửi email chứa link kèm token có hạn dùng ngắn → người dùng bấm link, nhập mật khẩu mới → gọi `POST /auth/reset-password` kèm token để xác nhận đổi mật khẩu.

```typescript
async function handleForgotPassword(email: string) {
  await api.post('/auth/forgot-password', { email });
  // Hiển thị thông báo: "Kiểm tra email để đặt lại mật khẩu"
}

async function handleResetPassword(token: string, newPassword: string) {
  await api.post('/auth/reset-password', { token, newPassword });
  navigate('/login');
}
```

---

## Common mistakes — lỗi người mới hay gặp

1. **Tưởng ẩn nút/route trên UI là đủ bảo mật**: `PrivateRoute`/`RequireRole` chỉ cải thiện trải nghiệm, không thay thế Guard ở backend — API vẫn phải tự kiểm tra token/role độc lập với frontend.
2. **Lưu token không đúng chỗ**: lưu `accessToken` trong `localStorage` khi ứng dụng có rủi ro XSS sẽ lộ token cho script độc hại đọc được.
3. **Quên xử lý accessToken hết hạn**: gọi API sau khi token hết hạn nhận về `401` nhưng không có luồng gọi `/auth/refresh` tự động — người dùng bị "văng" ra ngoài dù vẫn còn `refreshToken` hợp lệ.
4. **Không phân biệt loading/error/empty state** khi tải Dashboard — màn hình trắng hoặc treo loading vô hạn nếu API lỗi.

## Bài tập thực hành trên lớp

**Đề bài**:
1. Xây trang Login gọi API `/auth/login`, lưu token vào store, điều hướng vào `/dashboard`.
2. Tạo `PrivateRoute` bảo vệ toàn bộ nhóm route `/dashboard/*`.
3. Trang Dashboard hiển thị thông tin user lấy từ `/auth/profile`, có nút Logout.
4. Ẩn/hiện 1 menu item trong Dashboard dựa theo `role` của user (ví dụ chỉ `admin` thấy menu "Quản lý người dùng").

**Gợi ý hướng giải**: viết `useAuthStore` (Zustand) quản lý `accessToken`/`user` trước, các phần còn lại (axios instance, PrivateRoute, RequireRole) đều đọc dữ liệu từ store này.

## Homework

- [ ] Thêm luồng tự động gọi `/auth/refresh` khi accessToken hết hạn (interceptor response của axios, bắt lỗi `401`).
- [ ] Xây form "Quên mật khẩu" hoàn chỉnh (2 bước: nhập email → nhập mật khẩu mới qua link token).
- [ ] Thêm trang "Cập nhật thông tin cá nhân" và "Đổi mật khẩu" trong User Profile.
- [ ] (Nâng cao) Viết `RequirePermission` tương tự `RequireRole` nhưng kiểm tra theo permission thay vì role.

## Câu hỏi ôn tập

1. Vì sao bảo vệ route ở frontend không thể thay thế Guard ở backend?
2. Vì sao không nên lưu `accessToken` trong `localStorage` nếu ứng dụng có nguy cơ XSS?
3. Refresh Token Flow (Lesson 09) áp dụng ở phía frontend như thế nào khi `accessToken` hết hạn giữa lúc người dùng đang thao tác?
4. `RequireRole` ở mục "Chức năng phân quyền" giải quyết vấn đề UX gì? Nó có thay thế được `RolesGuard` ở backend không?
