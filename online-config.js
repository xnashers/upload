// Public Supabase URL and anon key are safe to ship when RLS is enabled.
// Image uploads use the signed-in Supabase admin session automatically.
export const ONLINE_CONFIG = Object.freeze({
  supabaseUrl: 'https://smtzqhutxteewcpaeads.supabase.co',
  supabaseAnonKey: 'sb_publishable_kX0-Bs-4cumLmFnA2QVBtg_SVFHHoGm',
  supabaseStorageBucket: 'hudas-media',
  supabaseStorageFolder: 'images'
});

export const isSupabaseConfigured = () => Boolean(
  ONLINE_CONFIG.supabaseUrl && ONLINE_CONFIG.supabaseAnonKey
);
