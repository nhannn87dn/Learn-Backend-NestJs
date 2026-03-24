# Folder Structure Rules

Each module MUST follow:

modules/
└── {module}/
    ├── controllers/
    │   ├── admin-{module}.controller.ts
    │   ├── public-{module}.controller.ts
    │
    ├── services/
    │   ├── {module}.service.ts
    │
    ├── dto/
    │   ├── request/
    │   ├── response/
    │
    ├── repositories/
    │   ├── {module}.repository.ts
    │
    ├── entities/
    │   ├── {module}.entity.ts
    │
    ├── {module}.module.ts

---

## Rules

- DO NOT put business logic in controller
- Service handles business logic
- Repository handles database
- DTO MUST be separated request/response