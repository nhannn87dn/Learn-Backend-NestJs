# Hướng dẫn cấu hình NestJS trên Docker cho Dev & Production

Tôi sẽ hướng dẫn bạn cấu hình hoàn chỉnh một dự án NestJS với Docker, PostgreSQL và Redis cho cả môi trường dev và production.

## 1. Cấu trúc thư mục

```
project/
├── src/
├── docker/
│   ├── Dockerfile.dev
│   └── Dockerfile.prod
├── docker-compose.yml
├── docker-compose.prod.yml
├── .dockerignore
├── .env.development
├── .env.production
├── package.json
└── tsconfig.json
```

## 2. Dockerfile cho Development## 3. Dockerfile cho Production## 4. Docker Compose cho Development## 5. Docker Compose cho Production## 6. File .dockerignore## 7. File .env mẫu## 8. Cấu hình Database Module trong NestJS## 9. Cấu hình Redis Module## 10. App Module chính## 11. Main.ts với cấu hình production-ready## 12. Package.json với scripts cần thiết## 13. Nginx Configuration (Optional cho Production)## 14. Makefile để quản lý commands dễ dàng hơn## Hướng dẫn sử dụng:

### **Development:**
```bash
# Khởi động môi trường dev
make dev-up
# hoặc
npm run docker:dev

# Xem logs
make dev-logs

# Vào shell container
make dev-shell

# Stop
make dev-down
```

### **Production:**
```bash
# Build và deploy production
make prod-build

# Xem logs
make prod-logs

# Stop
make prod-down
```

### **Các lưu ý quan trọng:**

**1. Security cho Production:**
- Luôn thay đổi tất cả passwords mặc định
- Sử dụng secrets management (Docker Swarm secrets, Kubernetes secrets)
- Không expose database ports ra ngoài
- Sử dụng HTTPS với SSL certificates
- Enable CORS chỉ cho trusted origins

**2. Performance:**
- Sử dụng connection pooling cho database
- Implement caching strategy với Redis
- Configure resource limits trong docker-compose
- Sử dụng multi-stage builds để giảm image size

**3. Monitoring & Logging:**
- Implement health checks
- Configure log rotation
- Sử dụng monitoring tools (Prometheus, Grafana)
- Setup alerts cho critical errors

**4. Backup:**
- Tự động backup database định kỳ
- Backup Redis data nếu cần persistent cache
- Test restore procedures thường xuyên

Bạn có câu hỏi gì về cấu hình này không? Tôi có thể giải thích chi tiết hơn về bất kỳ phần nào bạn quan tâm.