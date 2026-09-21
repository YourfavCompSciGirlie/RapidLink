import { NextResponse } from 'next/server';

import { createInitialState } from '@/features/emergency/fixtures';
import { generateRoomCode, normalizeRoomCode } from '@/features/emergency/session-service';
import { purgeExpiredSessions, supabaseConfigured, upsertSession } from '@/lib/supabase-server';

export async function POST(request: Request) {
  if (!supabaseConfigured) return NextResponse.json({ message: 'Remote sessions are not configured.' }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { code?: string };
  const code = normalizeRoomCode(body.code ?? generateRoomCode());
  if (code.length !== 6) return NextResponse.json({ message: 'A six-character code is required.' }, { status: 400 });
  try { await purgeExpiredSessions(); return NextResponse.json(await upsertSession(code, createInitialState())); }
  catch { return NextResponse.json({ message: 'The room could not be created.' }, { status: 502 }); }
}
