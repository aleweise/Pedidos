# Mejores Prácticas de Ingeniería Backend 2025

## Tabla de Contenidos
1. [Arquitectura y Diseño](#arquitectura-y-diseño)
2. [Seguridad](#seguridad)
3. [Performance y Escalabilidad](#performance-y-escalabilidad)
4. [Observabilidad](#observabilidad)
5. [Calidad de Código](#calidad-de-código)
6. [DevOps y CI/CD](#devops-y-cicd)
7. [Data Management](#data-management)
8. [Documentación](#documentación)
9. [Tendencias 2025](#tendencias-2025)
10. [Antipatrones a Evitar](#antipatrones-a-evitar)

---

## Arquitectura y Diseño

### Arquitectura de Microservicios Modernos

#### Event-Driven Architecture
- Utilizar patrones basados en eventos para desacoplar servicios
- Implementar Event Sourcing cuando se necesite auditoría completa
- Usar message brokers (Kafka, RabbitMQ) para comunicación asíncrona

#### Domain-Driven Design (DDD)
- Organizar el código alrededor de dominios de negocio, no de capas técnicas
- Definir bounded contexts claros
- Implementar agregados para mantener consistencia
- Usar value objects para tipos de dominio inmutables

#### CQRS (Command Query Responsibility Segregation)
- Separar comandos de consultas para optimizar rendimiento
- Aplicar solo cuando la complejidad lo justifique
- Diferentes modelos de datos para lectura y escritura

#### Service Mesh
- Implementar Istio o Linkerd para gestión avanzada de tráfico
- Service discovery automático
- Load balancing inteligente
- Circuit breaking y retry policies

#### Backend for Frontend (BFF)
- Crear APIs específicas por tipo de cliente (web, mobile, IoT)
- Reducir overfetching y underfetching
- Optimizar payloads por dispositivo

### Diseño de APIs

#### API-First Design
```yaml
# Ejemplo OpenAPI 3.1
openapi: 3.1.0
info:
  title: User Service API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
```

#### Principios REST
- Usar verbos HTTP correctamente (GET, POST, PUT, PATCH, DELETE)
- Recursos con nombres en plural (`/users`, `/orders`)
- Códigos de estado HTTP apropiados
- HATEOAS para APIs públicas maduras

#### GraphQL para Casos Complejos
- Cuando clientes necesitan flexibilidad en queries
- Implementar DataLoader para resolver N+1 queries
- Usar subscriptions para real-time updates
- Limitar profundidad de queries (max 5-7 niveles)

#### Versionado
```
# Opción 1: URL
/api/v1/users
/api/v2/users

# Opción 2: Header
Accept: application/vnd.myapi.v1+json

# Opción 3: Query parameter (menos recomendado)
/api/users?version=1
```

#### Rate Limiting
```javascript
// Ejemplo con Express
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

---

## Seguridad

### Autenticación y Autorización

#### OAuth 2.1 y OpenID Connect
- Usar proveedores establecidos (Auth0, Keycloak, AWS Cognito)
- Implementar PKCE para aplicaciones públicas
- Never store credentials en código

#### Zero Trust Architecture
```
Principios:
1. Never trust, always verify
2. Assume breach
3. Verify explicitly
4. Use least privilege access
5. Segment access
```

#### JWT Best Practices
```javascript
// Estructura JWT
{
  "header": {
    "alg": "RS256",  // Usar RSA, no HS256 en producción
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "iat": 1516239022,
    "exp": 1516240822,  // Expiración corta (15-30 min)
    "roles": ["user", "admin"]
  }
}

// Implementar refresh token rotation
// Access token: 15 min
// Refresh token: 7 días con rotación
```

#### mTLS para Servicios Internos
- Autenticación mutua entre microservicios
- Certificados con rotación automática
- Service mesh simplifica implementación

#### RBAC/ABAC
```javascript
// Role-Based Access Control
const roles = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read']
};

// Attribute-Based Access Control
function canAccess(user, resource, action) {
  return (
    user.department === resource.department &&
    user.clearanceLevel >= resource.requiredLevel &&
    user.permissions.includes(action)
  );
}
```

### Protección de Datos

#### Encriptación
```bash
# En tránsito
- TLS 1.3 mínimo
- Perfect Forward Secrecy
- HSTS headers

# En reposo
- AES-256-GCM para datos sensibles
- Encrypted fields en DB
- Encrypted backups
```

#### Secrets Management
```yaml
# Nunca en código o .env commiteados
# Usar:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

# Rotación automática cada 90 días
```

#### PII y Compliance
```javascript
// Anonimización
function anonymize(user) {
  return {
    id: hash(user.id),
    age_range: getAgeRange(user.age),
    country: user.country,
    // NO incluir: email, nombre, dirección
  };
}

// Implementar derecho al olvido (GDPR)
async function deleteUserData(userId) {
  await db.users.delete(userId);
  await eventStream.publish('user.deleted', { userId });
  await cache.delete(`user:${userId}`);
  await searchIndex.remove(userId);
}
```

#### Input Validation
```javascript
// Múltiples capas de validación
// 1. Client-side (UX)
// 2. API Gateway (primera línea)
// 3. Application layer (lógica de negocio)
// 4. Database constraints (última línea)

const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(13).max(120),
  username: Joi.string().alphanum().min(3).max(30).required()
});

// Sanitización
const validator = require('validator');
const clean = validator.escape(userInput);
```

#### Dependency Scanning
```yaml
# GitHub Actions example
- name: Run Snyk Security Scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

# Dependabot config
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## Performance y Escalabilidad

### Optimización de Base de Datos

#### Database per Service
```
✅ Cada microservicio tiene su propia BD
✅ Loose coupling
✅ Independencia tecnológica
❌ No compartir bases de datos entre servicios
```

#### Connection Pooling
```javascript
// PostgreSQL con node-postgres
const { Pool } = require('pg');

const pool = new Pool({
  max: 20, // Máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// HikariCP (Java)
// maximumPoolSize: 10 (para CPU de 2 cores)
// Formula: connections = ((core_count * 2) + effective_spindle_count)
```

#### Índices Estratégicos
```sql
-- Analizar query plans
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';

-- Crear índices apropiados
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- Índices parciales
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- Índices compuestos (orden importa)
CREATE INDEX idx_user_status_date ON users(status, created_at);
```

#### Particionamiento
```sql
-- Particionamiento por rango (PostgreSQL)
CREATE TABLE orders (
    id SERIAL,
    created_at TIMESTAMP,
    total DECIMAL
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

#### Read Replicas
```javascript
// Sequelize example
const sequelize = new Sequelize({
  replication: {
    read: [
      { host: 'replica1.example.com', username: 'read', password: 'xxx' },
      { host: 'replica2.example.com', username: 'read', password: 'xxx' }
    ],
    write: { host: 'primary.example.com', username: 'write', password: 'xxx' }
  }
});
```

### Caching Inteligente

#### Multi-Layer Caching
```
1. CDN (CloudFlare, Fastly)
   ↓
2. API Gateway Cache (Kong, nginx)
   ↓
3. Application Cache (Redis/Valkey)
   ↓
4. Database Query Cache
   ↓
5. Database Buffer Pool
```

#### Redis/Valkey Patterns
```javascript
// Cache-Aside (Lazy Loading)
async function getUser(userId) {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const user = await db.users.findById(userId);
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
  return user;
}

// Write-Through
async function updateUser(userId, data) {
  const user = await db.users.update(userId, data);
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
  return user;
}

// Cache warming
async function warmCache() {
  const popularUsers = await db.users.findPopular(100);
  for (const user of popularUsers) {
    await redis.setex(`user:${user.id}`, 3600, JSON.stringify(user));
  }
}
```

#### Cache Invalidation
```javascript
// Estrategias:
// 1. TTL (Time To Live)
await redis.setex('key', 300, value); // 5 minutos

// 2. Tag-based invalidation
await redis.sadd('tag:users', 'user:1', 'user:2');
// Cuando actualizar tag
await redis.smembers('tag:users').then(keys => redis.del(...keys));

// 3. Event-based invalidation
eventBus.on('user.updated', async (userId) => {
  await redis.del(`user:${userId}`);
});
```

#### HTTP Caching
```javascript
// Express example
app.get('/api/users/:id', (req, res) => {
  // Cache-Control
  res.set('Cache-Control', 'public, max-age=300'); // 5 min
  
  // ETag
  const etag = generateETag(userData);
  res.set('ETag', etag);
  
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send();
  }
  
  res.json(userData);
});
```

### Manejo Asíncrono

#### Message Queues
```javascript
// RabbitMQ - Para task queues, pub/sub
const amqp = require('amqplib');

async function sendToQueue(queue, message) {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true
  });
}

// Apache Kafka - Para event streaming
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'my-app', brokers: ['localhost:9092'] });
const producer = kafka.producer();

await producer.send({
  topic: 'user-events',
  messages: [{ value: JSON.stringify({ userId, event: 'created' }) }],
});
```

#### Background Jobs
```javascript
// Bull (Redis-based queue)
const Queue = require('bull');
const emailQueue = new Queue('email', 'redis://127.0.0.1:6379');

// Producer
emailQueue.add({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up'
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});

// Consumer
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

#### Circuit Breaker
```javascript
const CircuitBreaker = require('opossum');

const options = {
  timeout: 3000, // Timeout después de 3s
  errorThresholdPercentage: 50, // Abrir si 50% falla
  resetTimeout: 30000 // Intentar cerrar después de 30s
};

const breaker = new CircuitBreaker(asyncFunction, options);

breaker.fallback(() => ({ data: 'cached or default' }));

breaker.on('open', () => console.log('Circuit opened'));
breaker.on('halfOpen', () => console.log('Circuit half-open'));
breaker.on('close', () => console.log('Circuit closed'));
```

---

## Observabilidad

### Monitoreo y Logging

#### Structured Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Uso con contexto
logger.info('User created', {
  userId: user.id,
  email: user.email,
  traceId: req.traceId,
  spanId: req.spanId
});
```

#### Distributed Tracing
```javascript
// OpenTelemetry
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
  ],
});

// Crear spans manualmente
const tracer = provider.getTracer('my-service');
const span = tracer.startSpan('processing-order');
span.setAttribute('order.id', orderId);
// ... hacer trabajo
span.end();
```

#### Métricas RED
```javascript
// Rate, Errors, Duration
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.labels(req.method, req.route.path, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, req.route.path, res.statusCode).inc();
  });
  next();
});
```

#### SLIs y SLOs
```yaml
# Service Level Indicators
SLI_availability:
  description: "Percentage of successful requests"
  formula: "successful_requests / total_requests * 100"
  
SLI_latency:
  description: "95th percentile response time"
  formula: "p95(response_time)"

# Service Level Objectives
SLO_availability:
  target: "99.9%"  # 43 minutes downtime/month
  window: "30 days"

SLO_latency:
  target: "p95 < 200ms"
  window: "30 days"
```

### Alerting

#### Alert Rules
```yaml
# Prometheus alerting rules
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 10m
        labels:
          severity: warning
```

---

## Calidad de Código

### Testing Strategy

#### Test Pyramid
```
           /\
          /E2E\       10% - End-to-End (slow, fragile)
         /------\
        /Integration\ 20% - Integration tests
       /------------\
      /  Unit Tests  \ 70% - Unit tests (fast, reliable)
     /________________\
```

#### Unit Tests
```javascript
// Jest example
describe('UserService', () => {
  let userService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn()
    };
    userService = new UserService(mockRepository);
  });

  it('should create user with hashed password', async () => {
    const userData = { email: 'test@test.com', password: 'plain123' };
    mockRepository.save.mockResolvedValue({ id: 1, ...userData });

    const result = await userService.createUser(userData);

    expect(result.password).not.toBe('plain123');
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});
```

#### Integration Tests
```javascript
// Testing API endpoints
const request = require('supertest');
const app = require('../app');

describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'secure123'
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
  });
});
```

#### Contract Testing
```javascript
// Pact example (Consumer)
const { Pact } = require('@pact-foundation/pact');

const provider = new Pact({
  consumer: 'UserServiceClient',
  provider: 'UserService'
});

describe('User Service Contract', () => {
  it('should get user by id', async () => {
    await provider.addInteraction({
      state: 'user exists',
      uponReceiving: 'a request for user',
      withRequest: {
        method: 'GET',
        path: '/users/1'
      },
      willRespondWith: {
        status: 200,
        body: { id: 1, email: 'test@test.com' }
      }
    });

    // Test implementation
  });
});
```

### Code Quality Tools

#### Linting
```javascript
// .eslintrc.js
module.exports = {
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};

// Pre-commit hook (husky + lint-staged)
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"]
  }
}
```

---

## DevOps y CI/CD

### Infrastructure as Code

#### Terraform Example
```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_ecs_cluster" "main" {
  name = "app-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([{
    name  = "app"
    image = "myapp:latest"
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
  }])
}
```

### CI/CD Pipeline

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -t myapp:${{ github.sha }} .
          docker tag myapp:${{ github.sha }} myapp:latest
      
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/myapp myapp=myapp:${{ github.sha }}
          kubectl rollout status deployment/myapp
```

### Deployment Strategies

#### Blue-Green Deployment
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
---
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: blue  # Switch to 'green' when ready
  ports:
    - port: 80
      targetPort: 3000
```

#### Canary Deployment
```yaml
# Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    - match:
        - headers:
            canary:
              exact: "true"
      route:
        - destination:
            host: myapp
            subset: v2
    - route:
        - destination:
            host: myapp
            subset: v1
          weight: 90
        - destination:
            host: myapp
            subset: v2
          weight: 10
```

---

## Data Management

### Saga Pattern
```javascript
// Orchestration-based Saga
class OrderSaga {
  async execute(order) {
    const steps = [
      { 
        forward: () => this.reserveInventory(order),
        compensate: () => this.releaseInventory(order)
      },
      {
        forward: () => this.processPayment(order),
        compensate: () => this.refundPayment(order)
      },
      {
        forward: () => this.createShipment(order),
        compensate: () => this.cancelShipment(order)
      }
    ];

    const executedSteps = [];

    try {
      for (const step of steps) {
        await step.forward();
        executedSteps.push(step);
      }
      return { success: true };
    } catch (error) {
      // Compensate in reverse order
      for (const step of executedSteps.reverse()) {
        await step.compensate();
      }
      return { success: false, error };
    }
  }
}
```

### Outbox Pattern
```javascript
// Transaction with outbox
async function createOrder(order) {
  await db.transaction(async (trx) => {
    // 1. Insert order
    const newOrder = await trx('orders').insert(order);
    
    // 2. Insert event in outbox
    await trx('outbox').insert({
      aggregate_type: 'Order',
      aggregate_id: newOrder.id,
      event_type: 'OrderCreated',
      payload: JSON.stringify(order),
      created_at: new Date()
    });
  });
}

// Separate process polls outbox
setInterval(async () => {
  const events = await db('outbox')
    .where('published', false)
    .orderBy('created_at')
    .limit(100);

  for (const event of events) {
    await messageQueue.publish(event.event_type, event.payload);
    await db('outbox').where('id', event.id).update({ published: true });
  }
}, 5000);
```

---

## Documentación

### README Template
```markdown
# Project Name

## Description
Brief description of what the service does

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

## Quick Start
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run migrations
npm run migrate

# Start development server
npm run dev
```

## Architecture
[Link to architecture diagram]

## API Documentation
Available at `/api/docs` when running locally

## Testing
```bash
npm test              # Unit tests
npm run test:integration
npm run test:e2e
```

## Deployment
[Link to deployment guide]

## Contributing
[Link to contributing guidelines]
```

---

## Tendencias 2025

### eBPF para Observabilidad
```
Ventajas:
- Monitoring de bajo nivel sin modificar código
- Zero overhead en comparación con agentes tradicionales
- Visibilidad profunda de networking y syscalls
- Seguridad mejorada

Herramientas:
- Cilium (networking)
- Pixie (observability)
- Falco (security)
```

### WebAssembly en Backend
```rust
// Wasm plugin example
#[no_mangle]
pub extern "C" fn process_request(input: *const u8, len: usize) -> *const u8 {
    // Safe, sandboxed execution
    let data = unsafe { std::slice::from_raw_parts(input, len) };
    // Process...
}
```

### Edge Computing
```javascript
// Cloudflare Worker example
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Code runs on edge, near users
  const cache = caches.default;
  let response = await cache.match(request);
  
  if (!response) {
    response = await fetch(request);
    event.waitUntil(cache.put(request, response.clone()));
  }
  
  return response;
}
```

---

## Antipatrones a Evitar

### ❌ Microservicios Prematuros
**Problema**: Crear microservicios antes de entender el dominio
**Solución**: Empezar con monolito modular, extraer servicios cuando haya claridad

### ❌ Shared Database
**Problema**: Múltiples servicios accediendo a la misma BD
**Solución**: Database per service, comunicación via eventos

### ❌ Configuración Hardcodeada
```javascript
// ❌ Mal
const API_URL = "https://api.production.com";

// ✅ Bien
const API_URL = process.env.API_URL || "http://localhost:3000";
```

### ❌ Logging Excesivo
```javascript
// ❌ Mal - Log en cada línea
logger.info('Starting function');
logger.info('Validating input');
logger.info('Calling database');
logger.info('Processing result');

// ✅ Bien - Log en puntos clave
logger.info('Processing order', { orderId, userId });
try {
  const result = await processOrder(orderId);
  logger.info('Order processed successfully', { orderId, result });
} catch (error) {
  logger.error('Order processing failed', { orderId, error });
}
```

### ❌ Ignorar Tech Debt
**Solución**: Dedicar 20% del tiempo (1 día de cada sprint) a mejoras técnicas

### ❌ Sincronía Donde Debe Haber Asincronía
```javascript
// ❌ Mal - Bloqueante
app.post('/users', async (req, res) => {
  const user = await createUser(req.body);
  await sendWelcomeEmail(user.email); // Bloquea respuesta
  await notifySlack(user); // Bloquea respuesta
  res.json(user);
});

// ✅ Bien - Asíncrono
app.post('/users', async (req, res) => {
  const user = await createUser(req.body);
  
  // Fire and forget
  emailQueue.add({ type: 'welcome', userId: user.id });
  slackQueue.add({ type: 'new_user', userId: user.id });
  
  res.json(user);
});
```

---

## Checklist de Implementación

### Para Nuevo