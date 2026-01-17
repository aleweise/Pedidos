import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Tabla de usuarios (clientes y administradores)
    users: defineTable({
        email: v.string(),
        name: v.string(),
        passwordHash: v.string(),
        role: v.union(v.literal("user"), v.literal("admin")),
        phone: v.optional(v.string()),
        createdAt: v.number(),
        lastLogin: v.optional(v.number()),
        isActive: v.boolean(),
    })
        .index("by_email", ["email"])
        .index("by_role", ["role"])
        .index("by_createdAt", ["createdAt"]),

    // Tabla de pedidos de películas
    orders: defineTable({
        userId: v.id("users"),
        movieName: v.string(),
        movieYear: v.optional(v.number()),
        quality: v.union(
            v.literal("720p"),
            v.literal("1080p"),
            v.literal("4k")
        ),
        audioPreference: v.union(
            v.literal("latino"),
            v.literal("castellano"),
            v.literal("original")
        ),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("cancelled")
        ),
        notes: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_userId", ["userId"])
        .index("by_status", ["status"])
        .index("by_createdAt", ["createdAt"]),

    // Tabla de películas disponibles (catálogo)
    movies: defineTable({
        title: v.string(),
        year: v.number(),
        genre: v.string(),
        qualities: v.array(v.string()),
        imageUrl: v.optional(v.string()),
        isAvailable: v.boolean(),
        addedAt: v.number(),
    })
        .index("by_title", ["title"])
        .index("by_year", ["year"])
        .index("by_genre", ["genre"]),

    // Tabla de sesiones (para autenticación)
    sessions: defineTable({
        userId: v.id("users"),
        token: v.string(),
        expiresAt: v.number(),
        createdAt: v.number(),
    })
        .index("by_token", ["token"])
        .index("by_userId", ["userId"]),
});
