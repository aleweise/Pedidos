import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ===== Listar todos los usuarios (Admin) =====
export const list = query({
    args: {
        search: v.optional(v.string()),
        role: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        let users = await ctx.db.query("users").collect();

        // Filtrar por búsqueda
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            users = users.filter(
                (u) =>
                    u.name.toLowerCase().includes(searchLower) ||
                    u.email.toLowerCase().includes(searchLower)
            );
        }

        // Filtrar por rol
        if (args.role) {
            users = users.filter((u) => u.role === args.role);
        }

        // Filtrar por estado activo
        if (args.isActive !== undefined) {
            users = users.filter((u) => u.isActive === args.isActive);
        }

        // Ordenar por fecha de creación (más recientes primero)
        users.sort((a, b) => b.createdAt - a.createdAt);

        return users.map((u) => ({
            id: u._id,
            email: u.email,
            name: u.name,
            role: u.role,
            phone: u.phone,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin,
            isActive: u.isActive,
        }));
    },
});

// ===== Obtener usuario por ID =====
export const getById = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        return {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            isActive: user.isActive,
        };
    },
});

// ===== Actualizar usuario (Admin) =====
export const update = mutation({
    args: {
        userId: v.id("users"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("Usuario no encontrado");
        }

        const updates: Record<string, unknown> = {};

        if (args.name) updates.name = args.name;
        if (args.email) {
            // Verificar que el email no esté en uso
            const existing = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", args.email!.toLowerCase()))
                .first();
            if (existing && existing._id !== args.userId) {
                throw new Error("El email ya está en uso");
            }
            updates.email = args.email.toLowerCase();
        }
        if (args.phone !== undefined) updates.phone = args.phone;
        if (args.role) updates.role = args.role;

        await ctx.db.patch(args.userId, updates);
        return { success: true };
    },
});

// ===== Activar/Desactivar usuario =====
export const toggleActive = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("Usuario no encontrado");
        }

        await ctx.db.patch(args.userId, {
            isActive: !user.isActive,
        });

        return { success: true, isActive: !user.isActive };
    },
});

// ===== Eliminar usuario =====
export const remove = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("Usuario no encontrado");
        }

        // Eliminar sesiones del usuario
        const sessions = await ctx.db
            .query("sessions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();

        for (const session of sessions) {
            await ctx.db.delete(session._id);
        }

        // Eliminar usuario
        await ctx.db.delete(args.userId);
        return { success: true };
    },
});

// ===== Estadísticas de usuarios =====
export const getStats = query({
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();

        const total = users.length;
        const active = users.filter((u) => u.isActive).length;
        const admins = users.filter((u) => u.role === "admin").length;

        // Usuarios registrados en los últimos 7 días
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const newThisWeek = users.filter((u) => u.createdAt > weekAgo).length;

        // Usuarios registrados en los últimos 30 días
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const newThisMonth = users.filter((u) => u.createdAt > monthAgo).length;

        return {
            total,
            active,
            inactive: total - active,
            admins,
            regularUsers: total - admins,
            newThisWeek,
            newThisMonth,
        };
    },
});

// ===== Crear usuario desde admin =====
export const create = mutation({
    args: {
        email: v.string(),
        name: v.string(),
        password: v.string(),
        role: v.union(v.literal("user"), v.literal("admin")),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Verificar si el email ya existe
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
            .first();

        if (existing) {
            throw new Error("El email ya está registrado");
        }

        const userId = await ctx.db.insert("users", {
            email: args.email.toLowerCase(),
            name: args.name,
            passwordHash: btoa(args.password),
            role: args.role,
            phone: args.phone,
            createdAt: Date.now(),
            isActive: true,
        });

        return { userId };
    },
});
