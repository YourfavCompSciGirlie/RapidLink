import { NextResponse } from 'next/server';

import { normalizeRoomCode } from '@/features/emergency/session-service';
import { getSession, supabaseConfigured } from '@/lib/supabase-server';

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!supabaseConfigured) return NextResponse.json({ message: 'Remote sessions are not configured.' }, { status: 503 });
  try {
    const { code } = await params;
    const record = await getSession(normalizeRoomCode(code));
    return record ? NextResponse.json(record) : NextResponse.json({ message: 'Room not found.' }, { status: 404 });
  } catch { return NextResponse.json({ message: 'The room could not be loaded.' }, { status: 502 }); }
}
