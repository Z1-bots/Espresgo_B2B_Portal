/* ============================================================
   supabase-config.js — ESPRESSGO Supabase Client

   IMPORTANT:
   - This file is used by frontend pages.
   - Use your Supabase Project URL.
   - Use your anon/public key only.
   - DO NOT use the service_role key here.
   ============================================================ */


/* ============================================================
   Replace these two values with your own Supabase details
   ============================================================ */

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";

const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";


/* ============================================================
   Create Supabase client
   ============================================================ */

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


/* ============================================================
   Optional connection check
   This helps you confirm in browser console that Supabase loaded.
   ============================================================ */

console.log("ESPRESSGO Supabase client loaded.");