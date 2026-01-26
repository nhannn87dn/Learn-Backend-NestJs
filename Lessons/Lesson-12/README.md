# Lesson 12 -  MongoDB Advanced

## 1. Truy vấn nâng cao với Mongoose

* Populate (Join trong MongoDB)
  * Basic populate
  * Nested populate
  * Select fields khi populate
  * Virtual populate ⭐ (THÊM MỚI)
* Pagination
  * Offset-based (skip + limit)
  * Cursor-based (recommended cho large datasets) ⭐ (THÊM MỚI)
  * Total count với countDocuments()
* Filtering
  * Query builder pattern
  * Dynamic filters
  * Text search với $text và $search ⭐ (THÊM MỚI)
* Sorting
  * sort() method
  * Multiple field sorting
  * Index optimization cho sorting
* Aggregation Pipeline 
  * $match, $group, $project
  * $lookup (join collections)
  * $unwind (flatten arrays)
  * $sort, $limit, $skip
  * Ví dụ thực tế: Analytics, Reports

## 2. Transactions trong MongoDB 

* Multi-document ACID transactions
* Khi nào cần transactions?
* Implement transactions với Mongoose
* Best practices và limitations

## 3. Performance & Optimization 

* Explain() để phân tích query
* Index strategies
* Schema design patterns
  * Attribute Pattern
  * Bucket Pattern
  * Computed Pattern
* Connection pooling
* Caching strategies với Redis
* Monitoring với MongoDB Atlas/Cloud

## 4. Migration & Data Seeding 

* Tạo seed data cho MongoDB
* Migration strategies (không có native migration như SQL)
* Tools: migrate-mongo

## 5. Best Practices & Common Pitfalls 

* Schema design best practices
* Tránh N+1 queries
* Document size limits (16MB)
* Khi nào không nên dùng MongoDB?
* Security: Authentication, Authorization, Encryption
* Backup và Recovery strategies

## 6. So sánh với TypeORM (PostgreSQL)

* Điểm giống và khác
* Khi nào dùng cái nào?
* Có thể dùng cả hai trong một project? (Polyglot Persistence)

## 7. Thực hành: Xây dựng Blog API với MongoDB

* User Management
* Posts với Categories và Tags
* Comments (Embedded)
* Likes và Views counting
* Full-text search
* Analytics với Aggregation
