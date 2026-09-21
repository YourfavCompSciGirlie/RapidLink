import { NextResponse } from 'next/server';

import { applyEmergencyAction, normalizeRoomCode } from '@/features/emergency/session-service';
import type { EmergencyAction } from '@/features/emergency/types';
import { compareAndSwapSession, getSession, supabaseConfigured } from '@/lib/supabase-server';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!supabaseConfigured) return NextResponse.json({ message: 'Remote sessions are not configured.' }, { status: 503 });
  const event = await request.json().catch(() => null) as EmergencyAction | null;
  if (!event?.id || !event.type || !event.payload) return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  const code = normalizeRoomCode((await params).code);
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const record = await getSession(code);
      if (!record) return NextResponse.json({ message: 'Room not found.' }, { status: 404 });
      const updated = await compareAndSwapSession(record, applyEmergencyAction(record.state, event));
      if (updated) return NextResponse.json(updated);
    }
    return NextResponse.json({ message: 'The room changed too quickly. Retry the action.' }, { status: 409 });
  } catch { return NextResponse.json({ message: 'The action could not be synchronized.' }, { status: 502 }); }
}
