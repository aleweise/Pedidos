import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ===== Registro de usuario =====
export const signUp = mutation({
    args: {
        email: v.string(),
        name: v.string(),
        password: v.string(),
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

        // Hash simple para demo (en producción usar bcrypt o similar)
        const passwordHash = btoa(args.password);

        // Crear usuario
        const userId = await ctx.db.insert("users", {
            email: args.email.toLowerCase(),
            name: args.name,
            passwordHash,
            role: "user",
            phone: args.phone,
            createdAt: Date.now(),
            isActive: true,
        });

        // Crear sesión
        const token = crypto.randomUUID();
        await ctx.db.insert("sessions", {
            userId,
            token,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
            createdAt: Date.now(),
        });

        return { userId, token };
    },
});

// ===== Inicio de sesión =====
export const signIn = mutation({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
            .first();

        if (!user) {
            throw new Error("Credenciales inválidas");
        }

        if (!user.isActive) {
            throw new Error("La cuenta está desactivada");
        }

        // Verificar contraseña
        if (btoa(args.password) !== user.passwordHash) {
            throw new Error("Credenciales inválidas");
        }

        // Actualizar último login
        await ctx.db.patch(user._id, {
            lastLogin: Date.now(),
        });

        // Crear nueva sesión
        const token = crypto.randomUUID();
        await ctx.db.insert("sessions", {
            userId: user._id,
            token,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
            createdAt: Date.now(),
        });

        return {
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    },
});

// ===== Cerrar sesión =====
export const signOut = mutation({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (session) {
            await ctx.db.delete(session._id);
        }

        return { success: true };
    },
});

// ===== Obtener usuario actual por token =====
export const getCurrentUser = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            return null;
        }

        const user = await ctx.db.get(session.userId);
        if (!user || !user.isActive) {
            return null;
        }

        return {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        };
    },
});

// ===== Actualizar perfil =====
export const updateProfile = mutation({
    args: {
        token: v.string(),
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        currentPassword: v.optional(v.string()),
        newPassword: v.optional(v.string()),
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

        const user = await ctx.db.get(session.userId);
        if (!user) {
            throw new Error("Usuario no encontrado");
        }

        const updates: Record<string, unknown> = {};

        if (args.name) {
            updates.name = args.name;
        }

        if (args.phone !== undefined) {
            updates.phone = args.phone;
        }

        // Cambiar contraseña
        if (args.newPassword && args.currentPassword) {
            if (btoa(args.currentPassword) !== user.passwordHash) {
                throw new Error("Contraseña actual incorrecta");
            }
            updates.passwordHash = btoa(args.newPassword);
        }

        if (Object.keys(updates).length > 0) {
            await ctx.db.patch(user._id, updates);
        }

        return { success: true };
    },
});

// ===== Verificar si es admin =====
export const isAdmin = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            return false;
        }

        const user = await ctx.db.get(session.userId);
        return user?.role === "admin" && user?.isActive === true;
    },
});
