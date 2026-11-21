/* Copy to backend-config.js and fill only the Supabase project URL and public anon key.
   Never place OpenAI, Stripe, service-role or sync secrets in this file. */
window.OPENDOOR_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  FRONTEND_ORIGIN: window.location.origin
};
