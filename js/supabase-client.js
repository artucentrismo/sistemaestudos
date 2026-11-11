/**
 * Ciclo — Supabase client and individual account helpers.
 * Configure with meta[name="supabase-url"] and meta[name="supabase-anon-key"].
 * Never place a service_role/secret key in browser code.
 */
let clientPromise;

export async function getSupabase() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const url = document.querySelector('meta[name="supabase-url"]')?.content?.trim();
    const key = document.querySelector('meta[name="supabase-anon-key"]')?.content?.trim();
    if (!url || !key) throw new Error('Supabase ainda não foi configurado.');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    return createClient(url, key, { auth: {
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: true
    }});
  })();
  try { return await clientPromise; }
  catch (error) { clientPromise = undefined; throw error; }
}

export async function signUp({ email, password, displayName = '' }) {
  const supabase = await getSupabase();
  return supabase.auth.signUp({
    email: email.trim().toLowerCase(), password,
    options: { data: { display_name: displayName.trim() } }
  });
}
export async function signIn({ email, password }) {
  const supabase = await getSupabase();
  return supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
}
export async function signOut() {
  const supabase = await getSupabase();
  return supabase.auth.signOut();
}
export async function getCurrentSession() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}
