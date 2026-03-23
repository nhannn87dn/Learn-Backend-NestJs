# Lesson 10 - Build a Dashboard with ReactJS

## Mục tiêu bài học

* Xây dựng giao diện Dashboard cơ bản với ReactJS
* Kết nối giao diện với API Authentication của NestJS

## Init dự án ReactJS (phục vụ demo API)

* Khởi tạo ReactJS bằng Vite
* Cấu trúc tối thiểu cho CRUD
* Các package cần thiết
  * React Router
  * Axios
  * React Query
  * Antd Design
  * Zustand

## Kết nối ReactJS với API NestJS

* Client – Server trong REST API
* Axios instance
* Service layer gọi API

## Xây dựng giao diện Dashboard

* Giao diện chính Dashboard
* Hiển thị các thông tin tổng quan

## Xây dựng giao diện Login

* Form đăng nhập
* Xử lý xác thực người dùng
* Gửi yêu cầu đăng nhập
* Lưu trữ token JWT

## Cấu hình bảo vệ route private

* Tạo Private Route với React Router
* Chuyển hướng người dùng chưa đăng nhập về trang Login

## Hiển thị thông tin người dùng user profile

* Giao diện hiển thị thông tin người dùng
* Đổi mật khẩu
* Cập nhật thông tin cá nhân

## Chức năng đăng xuất

* Xử lý đăng xuất
* Xoá token khỏi client

## Chức năng phân quyền người dùng

* Phân nhóm người dùng (roles)
* Gán permission cho các roles
* Phân quyền truy cập vào các route và chức năng trong Dashboard

## Chức năng quên mật khẩu

* Giao diện quên mật khẩu
* Gửi email đặt lại mật khẩu
* Cập nhật mật khẩu mới
