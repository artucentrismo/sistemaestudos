/**
 * Private cloud persistence for the existing Ciclo application state.
 * RLS on user_app_state ensures each account can access only its own row.
 */
import { getSupabase, getCurrentUser } from './supabase-client.js';
const TABLE = 'user_app_state';
const STATE_VERSION = 1;

export async function loadCloudState() {
  const user = await getCurrentUser();
  if (!user) return { user: null, state: null };
  const supabase = await getSupabase();
  const { data, error } = await supabase.from(TABLE)
    .select('state, schema_version, updated_at')
    .eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return { user, state: data?.state ?? null, schemaVersion: data?.schema_version ?? STATE_VERSION };
}

export async function saveCloudState(state) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Entre na sua conta para sincronizar seus dados.');
  const supabase = await getSupabase();
  const { error } = await supabase.from(TABLE).upsert({
    user_id: user.id, state, schema_version: STATE_VERSION,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return { savedAt: new Date().toISOString() };
}
