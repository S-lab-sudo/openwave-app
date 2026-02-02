
import { Redis } from '@upstash/redis'

/**
 * UPSTASH REAL-TIME NERVE CENTER
 * Used for sub-millisecond session state and user vibe tracking.
 */

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Upstash Redis environment variables are missing. Taste tracking will be disabled.');
}

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
