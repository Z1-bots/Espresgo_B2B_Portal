/* ============================================================
   supabase-config.js — ESPRESSGO Supabase Client
   ============================================================ */


/* ============================================================
   Replace these two values with your own Supabase details
   ============================================================ */

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";

const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";


/* ============================================================
   Create Supabase client
   ============================================================ */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

window.sb = sb;
window.supabaseClient = sb;

console.log("ESPRESSGO Supabase client loaded.");