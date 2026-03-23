
# Lesson 12: Cache & Redis trong NestJS

## 1. Cache là gì & tại sao cần? (giữ nguyên, làm rõ hơn)
## 2. Cache Strategies
   - Học kỹ: Cache Aside
   - Biết tên: Write Through, Write Behind, Refresh Ahead
## 3. Cache Invalidation (TTL + Manual — đủ dùng)
## 4. Redis là gì?
   - Cài Redis bằng Docker
   - Thử với Redis CLI
   - Data structures cơ bản (String, Hash là đủ)
## 5. Setup Redis với NestJS
## 6. Sử dụng Cache trong NestJS
   - CacheInterceptor (cache route tự động)
   - Manual caching (cache query DB)
   - Cache Key Design
   - Ví dụ end-to-end: Cache danh sách sản phẩm
## 7. Cache fallback (Redis down thì sao?) ← giữ, rất thực tế