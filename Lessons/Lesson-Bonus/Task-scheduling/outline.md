# Bonus 04: Queue & Task Scheduling

> Tiên quyết: Lesson 13 (Redis), Bonus 03

* Queue là gì? Khi nào cần Queue (gửi mail, xử lý ảnh, tác vụ chạy lâu)
* Queue architecture
  * Producer
  * Consumer / Worker
  * Job
* BullMQ với NestJS (`@nestjs/bullmq`), dùng Redis làm backend
  * Tạo Queue, thêm Job
  * Processor xử lý Job
  * Job retry và backoff
  * Job delay
  * Job monitoring (Bull Board)
* Task Scheduling với `@nestjs/schedule`
  * Cron jobs (`@Cron`)
  * Interval, Timeout
  * Lưu ý khi chạy nhiều instance: job bị chạy trùng
