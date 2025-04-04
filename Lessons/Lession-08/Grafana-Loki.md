# **Hướng dẫn Cấu hình Grafana Loki để Giám sát Log NestJS**  

Grafana Loki là một hệ thống lưu trữ log **nhẹ, dễ triển khai, ít tốn tài nguyên**. Nó thường được sử dụng kết hợp với **Promtail** (trình thu thập log) và **Grafana** (giao diện trực quan hóa log).  

## **📌 Tổng Quan**  
Chúng ta sẽ cài đặt:  
1. **Loki** – Lưu trữ log.  
2. **Promtail** – Thu thập log từ ứng dụng NestJS.  
3. **Grafana** – Hiển thị log trên giao diện web.  

---

## **🔧 Bước 1: Cài đặt Docker (Nếu chưa có)**  
Chúng ta sẽ sử dụng Docker để dễ dàng triển khai Loki, Promtail và Grafana. Nếu chưa có Docker, bạn cài đặt như sau:  

- **Ubuntu/Debian:**  
  ```bash
  sudo apt update
  sudo apt install docker.io -y
  sudo systemctl enable docker
  sudo systemctl start docker
  ```
  
- **MacOS:**  
  Tải và cài đặt từ [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)  

- **Windows:**  
  Dùng **WSL2 + Docker Desktop** để chạy Docker.  

✅ Kiểm tra Docker đã cài đặt thành công:  
```bash
docker --version
```

---

## **📌 Bước 2: Chạy Loki, Promtail và Grafana bằng Docker**  
Tạo một thư mục chứa cấu hình:  
```bash
mkdir nestjs-logging && cd nestjs-logging
```

### **Tạo file `docker-compose.yml`**
Tạo và mở file:  
```bash
nano docker-compose.yml
```
Thêm nội dung sau vào:  
```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped
```

### **Tạo file `promtail-config.yml`**  
Tạo file cấu hình cho **Promtail** để đọc log từ ứng dụng NestJS:  
```bash
nano promtail-config.yml
```
Thêm nội dung sau vào:  
```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: "nestjs-logs"
    static_configs:
      - targets:
          - localhost
        labels:
          job: "nestjs"
          __path__: "/var/log/*.log"
```

### **Chạy các container Docker**  
```bash
docker-compose up -d
```
✅ Nếu thành công, bạn sẽ có **3 container** chạy:  
- **Loki** (cổng `3100`)  
- **Promtail** (đọc log từ `/var/log/*.log`)  
- **Grafana** (giao diện web, cổng `3000`)  

---

## **📌 Bước 3: Cấu hình NestJS để ghi log ra file**  

NestJS không lưu log vào file mặc định, nên ta cần chỉnh sửa **Logger** để ghi log vào file `/var/log/nestjs.log`.  

Cài đặt **Winston Logger**:  
```bash
npm install winston winston-daily-rotate-file
```

Tạo file **`logger.service.ts`** trong thư mục `src`:
```typescript
import { LoggerService, Injectable } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class AppLogger implements LoggerService {
  private logger = winston.createLogger({
    transports: [
      new winston.transports.Console(),
      new winston.transports.DailyRotateFile({
        filename: '/var/log/nestjs.log', // Ghi log vào file này
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      }),
    ],
  });

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace: string) {
    this.logger.error(`${message} -> ${trace}`);
  }

  warn(message: string) {
    this.logger.warn(message);
  }
}
```

Đăng ký Logger trong **`main.ts`**:  
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(),
  });

  await app.listen(3000);
}
bootstrap();
```

✅ Giờ NestJS sẽ ghi log vào **`/var/log/nestjs.log`**.

---

## **📌 Bước 4: Kết nối Grafana với Loki**  
### **Truy cập Grafana**  
Mở trình duyệt, vào:  
👉 **http://localhost:3000/**  

- **Username:** `admin`  
- **Password:** `admin`  

### **Thêm Loki làm Data Source**
1. **Vào Grafana → Configuration → Data Sources**  
2. **Chọn "Add data source" → Loki**  
3. **Nhập URL:** `http://loki:3100`  
4. **Nhấn "Save & Test"**  

---

## **📌 Bước 5: Truy vấn Log trên Grafana**  

### **Tạo Dashboard hiển thị log**
1. **Vào "Explore"**
2. **Chọn Data Source là Loki**
3. Nhập truy vấn sau:  
   ```
   {job="nestjs"}
   ```
4. Nhấn **Run Query** để xem log.  

🎉 **Bạn đã cấu hình thành công hệ thống giám sát log NestJS với Grafana Loki!** 🚀  

---

## **🔧 Cách mở rộng**
- **Tạo Alert khi có lỗi nghiêm trọng**  
- **Tích hợp với Prometheus để theo dõi hiệu suất API**  
- **Kết hợp với ELK Stack (Elasticsearch, Logstash, Kibana) nếu cần log phức tạp hơn**  

---

## 🚨 **Tạo Alert Khi Có Lỗi Nghiêm Trọng trong Grafana Loki**  

Sau khi đã thiết lập Grafana Loki để giám sát log từ NestJS, chúng ta có thể **tạo cảnh báo (Alerting)** khi xuất hiện các lỗi nghiêm trọng (ví dụ: **HTTP 500, lỗi database, lỗi timeout**).  

---

## **📌 Cách Hoạt Động của Alerting trong Grafana**
Grafana hỗ trợ alert thông qua **Prometheus-style Alerting Rules** hoặc **LogQL** (truy vấn Loki).  
- Khi log chứa từ khóa như `"error"`, `"500"`, `"Exception"` → **Kích hoạt cảnh báo**.  
- Alert có thể gửi **email, Telegram, Slack, Discord, Webhook...**  

---

## **🛠️ Bước 1: Cấu hình Alerting trong Grafana**
### **1.1 Bật Tính Năng Alerting trong Grafana**
Mở **Grafana**, vào:  
👉 **Alerting → Contact points**  
- Chọn **"New contact point"**  
- Chọn phương thức gửi thông báo (Email, Slack, Telegram, Webhook...)  

Ví dụ: **Gửi cảnh báo qua Email**  
- **Chọn Type:** "Email"  
- **Nhập email người nhận**  
- **Nhấn "Save contact point"**  

👉 **Alerting → Notification Policies**  
- **Nhấn "New policy" → Chọn contact point vừa tạo**  
- **Nhấn Save**  

---

## **🛠️ Bước 2: Tạo Rule Cảnh Báo Khi Có Lỗi Nghiêm Trọng**
Vào **Alerting → Alert rules → New alert rule**  

### **2.1 Viết Truy Vấn Tìm Lỗi**  
Dùng **LogQL** để truy vấn log có lỗi:  

#### **Lọc log có từ khóa "error" hoặc HTTP 500**
```logql
{job="nestjs"} |= "error"
```
Hoặc:
```logql
{job="nestjs"} |= "500"
```

#### **Tạo Rule Alert**
- **Alert condition:** "Count() > 0 trong vòng 5 phút"  
- **Group by:** "job"  
- **For:** 1m (Nếu lỗi tồn tại **1 phút**, gửi cảnh báo)  

---

## **🛠️ Bước 3: Tạo Notification Khi Có Lỗi**
- **Vào Alerting → Alert rules → Chọn Alert vừa tạo**  
- **Gán contact point (Email, Telegram, Slack, Webhook...)**  

Ví dụ: Nếu gửi cảnh báo **qua Telegram**  
1. Tạo bot Telegram tại [@BotFather](https://t.me/BotFather)  
2. Lấy **Bot Token**  
3. Lấy **Chat ID** từ [@userinfobot](https://t.me/userinfobot)  
4. Thêm webhook vào **Contact Point → Telegram** với API:  
   ```
   https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=Error in NestJS
   ```
5. Nhấn **Save**  

🎉 **Xong! Khi NestJS gặp lỗi nghiêm trọng, Grafana sẽ gửi cảnh báo đến Email/Telegram/Slack/Webhook.** 🚀  

Bạn muốn tích hợp với dịch vụ nào? Mình có thể hướng dẫn chi tiết! 💡