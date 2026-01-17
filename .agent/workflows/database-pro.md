# Mejores Prácticas con Convex 2025
## Base de Datos Reactiva Serverless

## Tabla de Contenidos
1. [Introducción a Convex](#introducción-a-convex)
2. [Arquitectura y Patrones](#arquitectura-y-patrones)
3. [Schema y Modelado de Datos](#schema-y-modelado-de-datos)
4. [Queries y Mutations](#queries-y-mutations)
5. [Actions y HTTP Endpoints](#actions-y-http-endpoints)
6. [Autenticación y Autorización](#autenticación-y-autorización)
7. [Performance y Optimización](#performance-y-optimización)
8. [Testing](#testing)
9. [Despliegue y CI/CD](#despliegue-y-cicd)
10. [Casos de Uso Avanzados](#casos-de-uso-avanzados)

---

## Introducción a Convex

### ¿Qué es Convex?
Convex es una plataforma de backend serverless que proporciona:
- **Base de datos reactiva** con subscripciones en tiempo real
- **Funciones serverless** (queries, mutations, actions)
- **TypeScript-first** con type safety completo
- **Sin configuración de infraestructura**
- **Sincronización automática** entre cliente y servidor

### Ventajas sobre Alternativas
```
✅ Real-time por defecto (no WebSockets manuales)
✅ Type safety end-to-end
✅ Sin ORMs, queries nativas optimizadas
✅ Transacciones ACID automáticas
✅ File storage integrado
✅ Scheduling de tareas incorporado
✅ Zero config deployment
```

### Instalación Rápida
```bash
# Instalar CLI
npm install -g convex

# Crear proyecto
npx create-convex@latest

# Estructura básica
my-app/
├── convex/
│   ├── schema.ts          # Definición de schema
│   ├── queries.ts         # Queries (read)
│   ├── mutations.ts       # Mutations (write)
│   ├── actions.ts         # Actions (side effects)
│   └── http.ts            # HTTP endpoints
├── src/
└── package.json
```

---

## Arquitectura y Patrones

### Estructura de Proyecto Recomendada

```
convex/
├── schema.ts                    # Schema central
├── _generated/                  # Auto-generado, no tocar
│   ├── api.d.ts
│   └── dataModel.d.ts
├── lib/                        # Utilidades compartidas
│   ├── validators.ts
│   ├── permissions.ts
│   └── helpers.ts
├── users/                      # Dominio: Users
│   ├── queries.ts
│   ├── mutations.ts
│   └── validators.ts
├── orders/                     # Dominio: Orders
│   ├── queries.ts
│   ├── mutations.ts
│   ├── actions.ts
│   └── types.ts
├── products/                   # Dominio: Products
│   ├── queries.ts
│   ├── mutations.ts
│   └── search.ts
├── crons.ts                    # Scheduled functions
└── http.ts                     # HTTP API routes
```

### Separación de Concerns

```typescript
// ✅ BIEN - Organizado por dominio
convex/
├── users/
│   ├── queries.ts        // Lecturas de usuarios
│   ├── mutations.ts      // Escrituras de usuarios
│   └── validators.ts     // Validación de datos
├── orders/
│   ├── queries.ts
│   └── mutations.ts

// ❌ MAL - Todo junto
convex/
├── queries.ts           // Todas las queries mezcladas
├── mutations.ts         // Todas las mutations mezcladas
```

---

## Schema y Modelado de Datos

### Definición de Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    settings: v.object({
      notifications: v.boolean(),
      theme: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])  // Índice único implícito
    .index("by_creation", ["createdAt"])
    .searchIndex("search_users", {
      searchField: "name",
      filterFields: ["role"],
    }),

  orders: defineTable({
    userId: v.id("users"),          // Foreign key
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      price: v.number(),
    })),
    total: v.number(),
    metadata: v.optional(v.any()),   // Datos flexibles
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_and_status", ["userId", "status"]),

  products: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    stock: v.number(),
    category: v.string(),
    tags: v.array(v.string()),
    images: v.array(v.id("_storage")),  // File storage
    isActive: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["category", "isActive"],
    }),
});
```

### Mejores Prácticas de Schema

#### 1. Timestamps Siempre
```typescript
// ✅ BIEN - Incluir timestamps
defineTable({
  // ... otros campos
  createdAt: v.number(),
  updatedAt: v.number(),
})

// Helper para usar en mutations
export const now = () => Date.now();
```

#### 2. Índices Estratégicos
```typescript
// ✅ BIEN - Índices para queries comunes
.index("by_user", ["userId"])
.index("by_user_and_date", ["userId", "createdAt"])

// ❌ MAL - Demasiados índices (costo de escritura)
.index("index1", ["field1"])
.index("index2", ["field2"])
.index("index3", ["field3"])
// ... 20 índices más
```

#### 3. Validación con Zod
```typescript
// convex/lib/validators.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1).max(100),
  })).min(1),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zipCode: z.string().regex(/^\d{5}$/),
  }),
});

// Uso en mutation
export const createOrder = mutation({
  args: {
    items: v.any(),
    shippingAddress: v.any(),
  },
  handler: async (ctx, args) => {
    // Validar con Zod
    const validatedData = createOrderSchema.parse(args);
    
    // Continuar con lógica...
  },
});
```

#### 4. Relaciones
```typescript
// Uno a Muchos (User → Orders)
orders: defineTable({
  userId: v.id("users"),  // Foreign key
  // ... otros campos
}).index("by_user", ["userId"])

// Muchos a Muchos (Products ↔ Tags)
productTags: defineTable({
  productId: v.id("products"),
  tagId: v.id("tags"),
}).index("by_product", ["productId"])
 .index("by_tag", ["tagId"])
```

---

## Queries y Mutations

### Queries (Lectura)

#### Query Básico
```typescript
// convex/users/queries.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

// Get user by ID
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// List users con paginación
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    
    return await ctx.db
      .query("users")
      .order("desc")
      .paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });
  },
});
```

#### Query con Filtros
```typescript
// Get orders by user and status
export const getUserOrders = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return await query.collect();
  },
});
```

#### Query con Relaciones (Joins)
```typescript
// Get order with user and products
export const getOrderDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    
    // Join con user
    const user = await ctx.db.get(order.userId);
    
    // Join con products
    const itemsWithDetails = await Promise.all(
      order.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        return {
          ...item,
          product,
        };
      })
    );
    
    return {
      ...order,
      user,
      items: itemsWithDetails,
    };
  },
});
```

#### Full-Text Search
```typescript
// Search products
export const searchProducts = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_products", (q) => {
        let search = q.search("name", args.searchTerm);
        
        if (args.category) {
          search = search.eq("category", args.category);
        }
        
        return search;
      })
      .collect();
    
    return results;
  },
});
```

### Mutations (Escritura)

#### Mutation Básica
```typescript
// convex/users/mutations.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    // Validar que no exista
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      throw new Error("User already exists");
    }
    
    // Crear usuario
    const userId = await ctx.db.insert("users", {
      ...args,
      avatar: undefined,
      settings: {
        notifications: true,
        theme: "light",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return userId;
  },
});
```

#### Mutation con Update
```typescript
export const update = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    settings: v.optional(v.object({
      notifications: v.boolean(),
      theme: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Verificar que existe
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Actualizar
    await ctx.db.patch(userId, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return userId;
  },
});
```

#### Mutation Transaccional
```typescript
// Create order con inventory check
export const createOrder = mutation({
  args: {
    userId: v.id("users"),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // 1. Verificar stock para todos los productos
    const products = await Promise.all(
      args.items.map((item) => ctx.db.get(item.productId))
    );
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const item = args.items[i];
      
      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product?.name}`);
      }
    }
    
    // 2. Calcular total
    let total = 0;
    const orderItems = args.items.map((item, i) => {
      const product = products[i]!;
      const price = product.price;
      total += price * item.quantity;
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        price,
      };
    });
    
    // 3. Crear orden
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      status: "pending",
      items: orderItems,
      total,
      createdAt: Date.now(),
    });
    
    // 4. Actualizar stock (todo en misma transacción)
    await Promise.all(
      args.items.map((item, i) => {
        const product = products[i]!;
        return ctx.db.patch(item.productId, {
          stock: product.stock - item.quantity,
        });
      })
    );
    
    return orderId;
  },
});
```

#### Soft Delete
```typescript
export const softDelete = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Query que excluye deleted
export const listActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
```

---

## Actions y HTTP Endpoints

### Actions (Side Effects)

```typescript
// convex/orders/actions.ts
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Action con API externa
export const processPayment = action({
  args: {
    orderId: v.id("orders"),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get order
    const order = await ctx.runQuery(api.orders.queries.get, {
      orderId: args.orderId,
    });
    
    if (!order) throw new Error("Order not found");
    
    // 2. Call external payment API
    const paymentResponse = await fetch("https://payment-api.com/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: order.total,
        currency: "USD",
        method: args.paymentMethod,
      }),
    });
    
    const paymentResult = await paymentResponse.json();
    
    // 3. Update order status
    if (paymentResult.status === "success") {
      await ctx.runMutation(api.orders.mutations.updateStatus, {
        orderId: args.orderId,
        status: "processing",
        paymentId: paymentResult.id,
      });
    } else {
      await ctx.runMutation(api.orders.mutations.updateStatus, {
        orderId: args.orderId,
        status: "cancelled",
      });
    }
    
    return paymentResult;
  },
});

// Action con email
export const sendOrderConfirmation = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(api.orders.queries.getOrderDetails, {
      orderId: args.orderId,
    });
    
    if (!order) return;
    
    // Send email via SendGrid/Resend
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "orders@myapp.com",
        to: order.user.email,
        subject: "Order Confirmation",
        html: `<h1>Order #${order._id} confirmed!</h1>`,
      }),
    });
  },
});
```

### HTTP Endpoints

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Webhook de Stripe
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    const body = await request.text();
    
    // Verificar firma de Stripe
    // ... lógica de verificación
    
    const event = JSON.parse(body);
    
    if (event.type === "payment_intent.succeeded") {
      await ctx.runMutation(api.orders.mutations.markAsPaid, {
        paymentIntentId: event.data.object.id,
      });
    }
    
    return new Response(null, { status: 200 });
  }),
});

// REST API endpoint
http.route({
  path: "/api/products",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    
    const products = await ctx.runQuery(api.products.queries.list, {
      category: category ?? undefined,
    });
    
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  }),
});

// Public file upload endpoint
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response("No file provided", { status: 400 });
    }
    
    // Store file
    const storageId = await ctx.storage.store(file);
    
    return new Response(JSON.stringify({ storageId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

---

## Autenticación y Autorización

### Clerk Integration (Recomendado)

```typescript
// convex/users/queries.ts
import { query } from "./_generated/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    // Clerk añade identity automáticamente
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return null;
    }
    
    // Buscar usuario en DB
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => 
        q.eq("clerkId", identity.subject)
      )
      .first();
    
    return user;
  },
});

// Mutation protegida
export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Unauthorized");
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => 
        q.eq("clerkId", identity.subject)
      )
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    await ctx.db.patch(user._id, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});
```

### Custom Authentication

```typescript
// convex/auth/mutations.ts
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      throw new Error("Invalid credentials");
    }
    
    // Verify password (usando bcrypt en action)
    const isValid = await verifyPassword(args.password, user.passwordHash);
    
    if (!isValid) {
      throw new Error("Invalid credentials");
    }
    
    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
      createdAt: Date.now(),
    });
    
    return { sessionId, user };
  },
});
```

### Role-Based Access Control

```typescript
// convex/lib/permissions.ts
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Unauthorized");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  
  if (!user || user.role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }
  
  return user;
}

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Unauthorized");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  
  if (!user) {
    throw new Error("User not found");
  }
  
  return user;
}

// Uso
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);  // Verifica que sea admin
    
    await ctx.db.delete(args.userId);
  },
});
```

---

## Performance y Optimización

### Paginación Eficiente

```typescript
// ✅ BIEN - Cursor-based pagination
export const listOrders = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .order("desc")
      .paginate({
        numItems: args.limit ?? 20,
        cursor: args.cursor ?? null,
      });
  },
});

// ❌ MAL - Cargar todo
export const getAllOrders = query({
  handler: async (ctx) => {
    return await ctx.db.query("orders").collect(); // No escala
  },
});
```

### Índices Compuestos

```typescript
// Schema con índice compuesto
orders: defineTable({
  userId: v.id("users"),
  status: v.string(),
  createdAt: v.number(),
})
  .index("by_user_status", ["userId", "status"])
  .index("by_user_date", ["userId", "createdAt"])

// Query optimizado
export const getUserPendingOrders = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Usa índice compuesto - muy rápido
    return await ctx.db
      .query("orders")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();
  },
});
```

### Batch Operations

```typescript
// ✅ BIEN - Batch con Promise.all
export const getMultipleProducts = query({
  args: { productIds: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.productIds.map((id) => ctx.db.get(id))
    );
  },
});

// ❌ MAL - Loop secuencial
export const getMultipleProductsSlow = query({
  args: { productIds: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const products = [];
    for (const id of args.productIds) {
      products.push(await ctx.db.get(id)); // Lento!
    }
    return products;
  },
});
```

### Caching en Cliente

```typescript
// React con Convex
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function ProductList() {
  // Convex cachea automáticamente y se suscribe a cambios
  const products = useQuery(api.products.queries.list);
  
  // Si products no cambia, componente no re-renderiza
  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
```

---

## Testing

### Unit Tests para Functions

```typescript
// convex/users/mutations.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { create } from "./mutations";

test("create user", async () => {
  const t = convexTest(schema);
  
  // Ejecutar mutation
  const userId = await t.mutation(create, {
    email: "test@example.com",
    name: "Test User",
    role: "user",
  });
  
  // Verificar resultado
  expect(userId).toBeDefined();
  
  // Verificar en DB
  const user = await t.db.get(userId);
  expect(user?.email).toBe("test@example.com");
  expect(user?.role).toBe("user");
});

test("create user - duplicate email", async () => {
  const t = convexTest(schema);
  
  // Crear primer usuario
  await t.mutation(create, {
    email: "test@example.com",
    name: "Test User",
    role: "user",
  });
  
  // Intentar crear duplicado
  await expect(
    t.mutation(create, {
      email: "test@example.com",
      name: "Another User",
      role: "user",
    })
  ).rejects.toThrow("User already exists");
});
```

### Integration Tests

```typescript
// tests/orders.test.ts
import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import schema from "../convex/schema";
import { createOrder } from "../convex/orders/mutations";
import { create as createProduct } from "../convex/products/mutations";

test("create order - full flow", async () => {
  const t = convexTest(schema);
  
  // Setup: crear productos
  const productId = await t.mutation(createProduct, {
    name: "Test Product",
    price: 100,
    stock: 10,
  });
  
  // Setup: crear usuario
  const userId = await t.mutation(create, {
    email: "buyer@example.com",
    name: "Buyer",
    role: "user",
  });
  
  // Action: crear orden
  const orderId = await t.mutation(createOrder, {
    userId,
    items: [{ productId, quantity: 2 }],
  });
  
  // Assert: verificar orden
  const order = await t.db.get(orderId);
  expect(order?.total).toBe(200);
  expect(order?.status).toBe("pending");
  
  // Assert: verificar stock reducido
  const product = await t.db.get(productId);
  expect(product?.stock).toBe(8);
});
```

---

## Despliegue y CI/CD

### Deployment Básico

```bash
# Deploy a producción
npx convex deploy

# Deploy con environment variables
npx convex deploy --cmd 'npm run build'

# Deploy preview (staging)
npx convex deploy --preview
```

### Variables de Entorno

```bash
# Set environment variables
npx convex env set STRIPE_API_KEY sk_live_xxx
npx convex env set RESEND_API