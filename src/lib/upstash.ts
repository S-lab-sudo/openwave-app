import { Redis } from '@upstash/redis'

/**
 * UPSTASH REAL-TIME NERVE CENTER
 * Used for sub-millisecond session state and user vibe tracking.
 */

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = (url && token) 
    ? new Redis({ url, token })
    : null;

/**
 * SAFE REDIS WRAPPER
 * Prevents the app from crashing if Redis is not configured.
 */
export const safeRedis = {
    get: async <T>(key: string): Promise<T | null> => {
        if (!redis) return null;
        try { 
            return await redis.get<T>(key); 
        } catch (e) { 
            console.warn(`Redis GET error for key ${key}:`, e);
            return null; 
        }
    },
    set: async <T>(key: string, value: T, opts?: { ex?: number }): Promise<string | null | unknown> => {
        if (!redis) return null;
        try { 
            // We cast opts to any only because SetCommandOptions is overly restrictive 
            // across library versions. The generic T still protects the value.
            const result = await redis.set(key, value, opts as any); 
            return result;
        } catch (e) { 
            console.warn(`Redis SET error for key ${key}:`, e);
            return null; 
        }
    },
    del: async (key: string): Promise<number | null> => {
        if (!redis) return null;
        try { 
            return await redis.del(key); 
        } catch (e) { 
            console.warn(`Redis DEL error for key ${key}:`, e);
            return null; 
        }
    }
};
