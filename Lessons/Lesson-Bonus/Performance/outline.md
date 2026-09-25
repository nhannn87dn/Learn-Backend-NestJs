# Bonus 08: Tối ưu hiệu suất

> Tiên quyết: Lesson 07, 13, 16

* Vì sao cần tối ưu? Đo trước khi tối ưu (benchmark với autocannon/k6)
* Ôn nhanh các kỹ thuật đã học
  * Database: Index, N+1, Pagination, Lazy vs Eager (Lesson 07)
  * Caching với Redis (Lesson 13)
* Connection Pooling với TypeORM
* Nén response (compression)
* Dùng Fastify adapter thay cho Express
* Chạy nhiều process với PM2 cluster mode
* Xử lý bất đồng bộ trong business logic: `Promise.all`, đẩy tác vụ nặng sang Queue (Bonus 04)
* Đo thời gian xử lý bằng Interceptor, structured logging
