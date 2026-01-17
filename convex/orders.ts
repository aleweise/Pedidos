import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ===== Listar pedidos con filtros =====
export const list = query({
    args: {
        status: v.optional(v.string()),
        userId: v.optional(v.id("users")),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let orders = await ctx.db.query("orders").collect();

        // Filtrar por estado
        if (args.status) {
            orders = orders.filter((o) => o.status === args.status);
        }

        // Filtrar por usuario
        if (args.userId) {
            orders = orders.filter((o) => o.userId === args.userId);
        }

        // Buscar por nombre de película
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            orders = orders.filter((o) =>
                o.movieName.toLowerCase().includes(searchLower)
            );
        }

        // Ordenar por fecha (más recientes primero)
        orders.sort((a, b) => b.createdAt - a.createdAt);

        // Obtener información del usuario para cada pedido
        const ordersWithUser = await Promise.all(
            orders.map(async (order) => {
                const user = await ctx.db.get(order.userId);
                return {
                    id: order._id,
                    movieName: order.movieName,
                    movieYear: order.movieYear,
                    quality: order.quality,
                    audioPreference: order.audioPreference,
                    status: order.status,
                    notes: order.notes,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    user: user
                        ? { id: user._id, name: user.name, email: user.email }
                        : null,
                };
            })
        );

        return ordersWithUser;
    },
});

// ===== Obtener pedido por ID =====
export const getById = query({
    args: {
        orderId: v.id("orders"),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        const user = await ctx.db.get(order.userId);

        return {
            id: order._id,
            movieName: order.movieName,
            movieYear: order.movieYear,
            quality: order.quality,
            audioPreference: order.audioPreference,
            status: order.status,
            notes: order.notes,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            user: user ? { id: user._id, name: user.name, email: user.email } : null,
        };
    },
});

// ===== Crear nuevo pedido =====
export const create = mutation({
    args: {
        userId: v.id("users"),
        movieName: v.string(),
        movieYear: v.optional(v.number()),
        quality: v.union(v.literal("720p"), v.literal("1080p"), v.literal("4k")),
        audioPreference: v.union(
            v.literal("latino"),
            v.literal("castellano"),
            v.literal("original")
        ),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("Usuario no encontrado");
        }

        const orderId = await ctx.db.insert("orders", {
            userId: args.userId,
            movieName: args.movieName,
            movieYear: args.movieYear,
            quality: args.quality,
            audioPreference: args.audioPreference,
            status: "pending",
            notes: args.notes,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { orderId };
    },
});

// ===== Crear pedido con token de sesión =====
export const createWithToken = mutation({
    args: {
        token: v.string(),
        movieName: v.string(),
        movieYear: v.optional(v.number()),
        quality: v.union(v.literal("720p"), v.literal("1080p"), v.literal("4k")),
        audioPreference: v.union(
            v.literal("latino"),
            v.literal("castellano"),
            v.literal("original")
        ),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Verificar sesión
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Sesión inválida");
        }

        const orderId = await ctx.db.insert("orders", {
            userId: session.userId,
            movieName: args.movieName,
            movieYear: args.movieYear,
            quality: args.quality,
            audioPreference: args.audioPreference,
            status: "pending",
            notes: args.notes,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { orderId };
    },
});

// ===== Actualizar estado del pedido =====
export const updateStatus = mutation({
    args: {
        orderId: v.id("orders"),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("cancelled")
        ),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Pedido no encontrado");
        }

        const updates: Record<string, unknown> = {
            status: args.status,
            updatedAt: Date.now(),
        };

        if (args.notes !== undefined) {
            updates.notes = args.notes;
        }

        await ctx.db.patch(args.orderId, updates);
        return { success: true };
    },
});

// ===== Eliminar pedido =====
export const remove = mutation({
    args: {
        orderId: v.id("orders"),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Pedido no encontrado");
        }

        await ctx.db.delete(args.orderId);
        return { success: true };
    },
});

// ===== Pedidos de un usuario =====
export const getByUser = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            return [];
        }

        const orders = await ctx.db
            .query("orders")
            .withIndex("by_userId", (q) => q.eq("userId", session.userId))
            .collect();

        orders.sort((a, b) => b.createdAt - a.createdAt);

        return orders.map((order) => ({
            id: order._id,
            movieName: order.movieName,
            movieYear: order.movieYear,
            quality: order.quality,
            audioPreference: order.audioPreference,
            status: order.status,
            notes: order.notes,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        }));
    },
});

// ===== Estadísticas de pedidos =====
export const getStats = query({
    handler: async (ctx) => {
        const orders = await ctx.db.query("orders").collect();

        const total = orders.length;
        const pending = orders.filter((o) => o.status === "pending").length;
        const processing = orders.filter((o) => o.status === "processing").length;
        const completed = orders.filter((o) => o.status === "completed").length;
        const cancelled = orders.filter((o) => o.status === "cancelled").length;

        // Pedidos de los últimos 7 días
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const thisWeek = orders.filter((o) => o.createdAt > weekAgo).length;

        // Pedidos de los últimos 30 días
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const thisMonth = orders.filter((o) => o.createdAt > monthAgo).length;

        // Pedidos por día (últimos 7 días)
        const dailyOrders: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const count = orders.filter(
                (o) => o.createdAt >= dayStart.getTime() && o.createdAt < dayEnd.getTime()
            ).length;

            dailyOrders.push({
                date: dayStart.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
                count,
            });
        }

        return {
            total,
            pending,
            processing,
            completed,
            cancelled,
            thisWeek,
            thisMonth,
            dailyOrders,
        };
    },
});
