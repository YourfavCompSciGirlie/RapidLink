import type { EmergencyState, SessionRecord } from '@/features/emergency/types';

interface SessionRow {
  id: string;
  code: string;
  state: EmergencyState;
  version: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = Boolean(url && serviceKey);

const headers = (extra: HeadersInit = {}) => ({
  apikey: serviceKey ?? '',
  authorization: `Bearer ${serviceKey ?? ''}`,
  ...extra,
});

const toRecord = (row: SessionRow): SessionRecord => ({
  id: row.id,
  code: row.code,
  state: row.state,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  expiresAt: row.expires_at,
});

export async function getSession(code: string): Promise<SessionRecord | null> {
  if (!supabaseConfigured) return null;
  const activeAfter = encodeURIComponent(new Date().toISOString());
  const response = await fetch(`${url}/rest/v1/rapidlink_sessions?code=eq.${encodeURIComponent(code)}&expires_at=gt.${activeAfter}&select=*`, {
    headers: headers(), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Session lookup failed: ${response.status}`);
  const rows = await response.json() as SessionRow[];
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function purgeExpiredSessions() {
  if (!supabaseConfigured) return;
  await fetch(`${url}/rest/v1/rapidlink_sessions?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, {
    method: 'DELETE', headers: headers(), cache: 'no-store',
  });
}

export async function upsertSession(code: string, state: EmergencyState): Promise<SessionRecord> {
  if (!supabaseConfigured) throw new Error('Supabase is not configured');
  const timestamp = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  const response = await fetch(`${url}/rest/v1/rapidlink_sessions?on_conflict=code`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({ code, state, version: 0, updated_at: timestamp, expires_at: expiresAt }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Session creation failed: ${response.status}`);
  return toRecord((await response.json() as SessionRow[])[0]);
}

export async function compareAndSwapSession(record: SessionRecord, state: EmergencyState): Promise<SessionRecord | null> {
  if (!supabaseConfigured) return null;
  const response = await fetch(`${url}/rest/v1/rapidlink_sessions?code=eq.${encodeURIComponent(record.code)}&version=eq.${record.version}`, {
    method: 'PATCH',
    headers: headers({ 'content-type': 'application/json', prefer: 'return=representation' }),
    body: JSON.stringify({ state, version: record.version + 1, updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Session update failed: ${response.status}`);
  const rows = await response.json() as SessionRow[];
  return rows[0] ? toRecord(rows[0]) : null;
}

export async function uploadAttachment(code: string, file: File) {
  if (!supabaseConfigured) throw new Error('Supabase is not configured');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${code}/${crypto.randomUUID()}-${safeName}`;
  const upload = await fetch(`${url}/storage/v1/object/rapidlink-media/${path}`, {
    method: 'POST', headers: headers({ 'content-type': file.type, 'x-upsert': 'false' }), body: await file.arrayBuffer(),
  });
  if (!upload.ok) throw new Error(`Attachment upload failed: ${upload.status}`);
  const signed = await fetch(`${url}/storage/v1/object/sign/rapidlink-media/${path}`, {
    method: 'POST', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify({ expiresIn: 86_400 }),
  });
  if (!signed.ok) throw new Error(`Attachment signing failed: ${signed.status}`);
  const result = await signed.json() as { signedURL?: string; signedUrl?: string };
  const signedPath = result.signedURL ?? result.signedUrl;
  return { storagePath: path, url: signedPath?.startsWith('http') ? signedPath : `${url}/storage/v1${signedPath}` };
}
