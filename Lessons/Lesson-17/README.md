# Lesson 17 - Production Deployment & DevOps

## Phần 1: Pre-Deployment Preparation

### 1.1 Security Checklist 

- Environment variables security
- CORS, Helmet, Rate limiting
- Authentication & Authorization
- Dependency vulnerability scan
- HTTPS/SSL

### 1.2 Performance Checklist

- Database optimization
- Caching strategy
- Compression
- Load testing
- Memory optimization

### 1.3 Code Quality 

- Code review
- Linting & Formatting
- TypeScript strict mode
- Dead code removal

### 1.4 Testing 

- Unit tests (coverage ≥80%)
- Integration tests
- E2E tests
- Load testing
- Security testing

### 1.5 Database Preparation

- Migration scripts
- Backup strategy
- Indexes optimization
- Connection pooling

### 1.6 Monitoring & Logging 

- Structured logging
- Error tracking (Sentry)
- APM tools
- Alert configuration

### 1.7 Documentation

- API documentation
- Deployment guide
- Environment variables
- Troubleshooting guide

## Phần 2: Build & Configuration

### 2.1 Environment Configuration

- Dev vs Staging vs Production
- Secrets management
- Configuration validation

### 2.2 Production Build

- Build optimization
- Source maps
- Static assets
- Bundle analysis

## Phần 3: Process Management

### 3.1 PM2 

- Cluster mode
- Ecosystem file
- Auto-restart
- PM2 monitoring

### 3.2 Alternatives

- systemd
- supervisord

## Phần 4: Containerization

### 4.1 Docker  từ "Docker basic"

- Multi-stage Dockerfile
- Best practices
- Docker Compose
- Image optimization
- Security scanning
- Health checks

## Phần 5: Deployment Strategies

- Blue-Green deployment
- Rolling deployment
- Canary deployment
- Zero-downtime deployment
- Rollback strategy

## Phần 6: Deployment Platforms

### 6.1 VPS Deployment 

- Server selection & setup
- SSH hardening
- Nginx reverse proxy
- SSL/TLS (Let's Encrypt)
- Firewall configuration
- Automated deployment

### 6.2 PaaS Deployment 

- Heroku
- Render
- Railway
- Vercel/Netlify
- AWS Elastic Beanstalk
- Google App Engine
- Azure App Service
- Pricing comparison

### 6.3 Container Orchestration 

**Kubernetes:**

- Basics (Pods, Deployments, Services)
- Manifests & kubectl
- ConfigMaps & Secrets
- Ingress & Autoscaling
- Managed K8s (EKS, GKE, AKS)
- Helm charts

**Docker Swarm:**

- Swarm setup
- Service deployment
- Stack files

## Phần 7: Database Deployment

- Managed databases (RDS, MongoDB Atlas)
- Migration in production
- Backup automation
- Replication setup

## Phần 8: CI/CD Pipeline

- GitHub Actions
- GitLab CI/CD
- Jenkins
- Automated testing & deployment
- Environment-specific pipelines
- Deployment gates

## Phần 9: Monitoring & Observability 

- Application monitoring
- Infrastructure monitoring
- Log aggregation (ELK)
- Metrics (Prometheus + Grafana)
- Distributed tracing (Jaeger)
- Error tracking (Sentry)
- Uptime monitoring

## Phần 10: Định hướng mở rộng

- Websockets với NestJS
- Microservices với NestJS
- GraphQL với NestJS
- CQRS pattern
- Event Sourcing
