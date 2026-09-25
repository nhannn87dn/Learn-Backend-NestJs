# Bonus 07: Microservices với NestJS

> Tiên quyết: Lesson 13, Bonus 03, Bonus 04

* Microservices là gì? Monolith vs Microservices
* Kiến trúc Microservices (API Gateway, mỗi service một database)
* Cài đặt Microservice với `@nestjs/microservices`
* Transport giữa các service
  * TCP
  * Redis
  * NATS
  * RabbitMQ
  * gRPC
* Message patterns
  * Request-response (`@MessagePattern`)
  * Event-based (`@EventPattern`)
* ClientProxy
* Demo: API Gateway + 1 service giao tiếp qua RabbitMQ
