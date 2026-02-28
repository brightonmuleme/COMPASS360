import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://MISSING_URL.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING_KEY';

if (supabaseUrl === 'https://MISSING_URL.supabase.co' || supabaseKey === 'MISSING_KEY') {
    console.warn("⚠️ DATABASE CONNECTION: Missing Supabase URL or Anon Key. Check Vercel Dashboard Environment Variables.");
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);
