# Lesson 10: Authorization với NestJS

## Authorization là gì?
  * Khái niệm Authorization
  * Authentication vs Authorization
## Các Mô hình Authorization trong Backend
  * Role-based access control (RBAC)
  * Permission-based authorization
  * Ownership-based authorization
## RBAC Implementation
  * Tạo Role và Permission
  * Gán Role cho User
  * Gán Permission cho Role
## Protecting Routes với Authorization Guards
  * Custom decorator `@Roles()` với `SetMetadata` và `Reflector`
  * Tạo RolesGuard
  * Sử dụng Guards trong Controllers
## Advanced Authorization
  * Attribute-based access control (ABAC)
  * Policy-based authorization
