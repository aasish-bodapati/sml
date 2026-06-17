import { createClient } from '@supabase/supabase-js';

// Load our Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create and export a single connection instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
