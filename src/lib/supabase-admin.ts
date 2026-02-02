import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * SUPABASE ADMIN CLIENT
 * Uses the service role key for bypass RLS and perform backend operations.
 * NEVER use this on the client side.
 */
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : (null as any); // Fallback for build time safety
