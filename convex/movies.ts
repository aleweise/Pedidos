import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ===== Listar películas =====
export const list = query({
    args: {
        search: v.optional(v.string()),
        genre: v.optional(v.string()),
        isAvailable: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        let movies = await ctx.db.query("movies").collect();

        // Buscar por título
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            movies = movies.filter((m) =>
                m.title.toLowerCase().includes(searchLower)
            );
        }

        // Filtrar por género
        if (args.genre) {
            movies = movies.filter((m) => m.genre === args.genre);
        }

        // Filtrar por disponibilidad
        if (args.isAvailable !== undefined) {
            movies = movies.filter((m) => m.isAvailable === args.isAvailable);
        }

        // Ordenar por fecha de agregado (más recientes primero)
        movies.sort((a, b) => b.addedAt - a.addedAt);

        return movies.map((m) => ({
            id: m._id,
            title: m.title,
            year: m.year,
            genre: m.genre,
            qualities: m.qualities,
            imageUrl: m.imageUrl,
            isAvailable: m.isAvailable,
            addedAt: m.addedAt,
        }));
    },
});

// ===== Obtener película por ID =====
export const getById = query({
    args: {
        movieId: v.id("movies"),
    },
    handler: async (ctx, args) => {
        const movie = await ctx.db.get(args.movieId);
        if (!movie) return null;

        return {
            id: movie._id,
            title: movie.title,
            year: movie.year,
            genre: movie.genre,
            qualities: movie.qualities,
            imageUrl: movie.imageUrl,
            isAvailable: movie.isAvailable,
            addedAt: movie.addedAt,
        };
    },
});

// ===== Agregar película =====
export const create = mutation({
    args: {
        title: v.string(),
        year: v.number(),
        genre: v.string(),
        qualities: v.array(v.string()),
        imageUrl: v.optional(v.string()),
        isAvailable: v.boolean(),
    },
    handler: async (ctx, args) => {
        const movieId = await ctx.db.insert("movies", {
            title: args.title,
            year: args.year,
            genre: args.genre,
            qualities: args.qualities,
            imageUrl: args.imageUrl,
            isAvailable: args.isAvailable,
            addedAt: Date.now(),
        });

        return { movieId };
    },
});

// ===== Actualizar película =====
export const update = mutation({
    args: {
        movieId: v.id("movies"),
        title: v.optional(v.string()),
        year: v.optional(v.number()),
        genre: v.optional(v.string()),
        qualities: v.optional(v.array(v.string())),
        imageUrl: v.optional(v.string()),
        isAvailable: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const movie = await ctx.db.get(args.movieId);
        if (!movie) {
            throw new Error("Película no encontrada");
        }

        const updates: Record<string, unknown> = {};

        if (args.title) updates.title = args.title;
        if (args.year) updates.year = args.year;
        if (args.genre) updates.genre = args.genre;
        if (args.qualities) updates.qualities = args.qualities;
        if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
        if (args.isAvailable !== undefined) updates.isAvailable = args.isAvailable;

        await ctx.db.patch(args.movieId, updates);
        return { success: true };
    },
});

// ===== Eliminar película =====
export const remove = mutation({
    args: {
        movieId: v.id("movies"),
    },
    handler: async (ctx, args) => {
        const movie = await ctx.db.get(args.movieId);
        if (!movie) {
            throw new Error("Película no encontrada");
        }

        await ctx.db.delete(args.movieId);
        return { success: true };
    },
});

// ===== Toggle disponibilidad =====
export const toggleAvailability = mutation({
    args: {
        movieId: v.id("movies"),
    },
    handler: async (ctx, args) => {
        const movie = await ctx.db.get(args.movieId);
        if (!movie) {
            throw new Error("Película no encontrada");
        }

        await ctx.db.patch(args.movieId, {
            isAvailable: !movie.isAvailable,
        });

        return { success: true, isAvailable: !movie.isAvailable };
    },
});

// ===== Obtener géneros únicos =====
export const getGenres = query({
    handler: async (ctx) => {
        const movies = await ctx.db.query("movies").collect();
        const genres = [...new Set(movies.map((m) => m.genre))];
        return genres.sort();
    },
});

// ===== Estadísticas de películas =====
export const getStats = query({
    handler: async (ctx) => {
        const movies = await ctx.db.query("movies").collect();

        const total = movies.length;
        const available = movies.filter((m) => m.isAvailable).length;

        // Contar por género
        const genreCounts: Record<string, number> = {};
        movies.forEach((m) => {
            genreCounts[m.genre] = (genreCounts[m.genre] || 0) + 1;
        });

        // Películas agregadas esta semana
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const addedThisWeek = movies.filter((m) => m.addedAt > weekAgo).length;

        return {
            total,
            available,
            unavailable: total - available,
            genreCounts,
            addedThisWeek,
        };
    },
});
