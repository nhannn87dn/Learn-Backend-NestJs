# Lesson 07 - TypeORM Advanced

## 1. Quan hệ dữ liệu

* One-to-One
* One-to-Many
* Many-to-Many
* Self-referencing Relations
* Cascade, eager, lazy
* Bi-directional vs Uni-directional
* @JoinColumn và @JoinTable
* onDelete, onUpdate behaviors
* Circular Dependencies

## 2. Migrations

* Migrations là gì? Vì sao không dùng `synchronize: true` ở production?
* Tạo và chạy Migrations với TypeORM

## 3. Seeding Database

* Seeding là gì?
* Tạo và chạy Seeder với TypeORM

## 4. Truy vấn nâng cao

* FindOptions và Where Operators
* Relations (Eager/Lazy, Select fields)
* Pagination (Offset và Cursor-based)
* Filtering & Search
* Sorting
* Aggregation
* GROUP BY và HAVING
* Subqueries

## 5. Query Builder

* Query Builder là gì?
* Khi nào dùng Query Builder
* CRUD với Query Builder
* JOIN operations
* Subqueries
* Parameters binding
* Conditional queries
* Query caching

## 6. Transactions

* Transaction là gì? ACID
* QueryRunner approach
* Transaction decorator
* Isolation levels
* Error handling
* Best practices

## 7. Raw Query

* Khi nào cần Raw Query
* Cách sử dụng an toàn
* Parameter binding
* Security concerns

## 8. Soft Delete & Auditing

* Soft Delete implementation
* Restore records
* Auditing columns
* Version control

## 9. Indexes & Performance

* Types of Indexes
* Tạo Indexes
* EXPLAIN queries
* N+1 problem
* Query optimization
* Performance monitoring

## 10. SQL Stored Procedures

* Khi nào dùng Stored Procedures
* Cách gọi từ TypeORM

## 11. Advanced Patterns & Best Practices

* Custom Repositories
* Specification Pattern
* Testing strategies
* Common pitfalls
