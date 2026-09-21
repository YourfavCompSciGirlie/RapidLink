import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { EmergencyState } from '@/features/emergency/types';

let client: SupabaseClient | null = null;

const browserClient = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
};

export function subscribeToRoom(code: string, onState: (state: EmergencyState) => void) {
  const supabase = browserClient();
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`rapidlink-room-${code}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rapidlink_sessions', filter: `code=eq.${code}` }, (payload) => {
      const state = (payload.new as { state?: EmergencyState }).state;
      if (state) onState(state);
    })
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
