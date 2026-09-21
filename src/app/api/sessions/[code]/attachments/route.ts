import { NextResponse } from 'next/server';

import { normalizeRoomCode } from '@/features/emergency/session-service';
import { supabaseConfigured, uploadAttachment } from '@/lib/supabase-server';

const allowedImage = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!supabaseConfigured) return NextResponse.json({ message: 'Remote attachments are not configured.' }, { status: 503 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || (!allowedImage.has(file.type) && !file.type.startsWith('audio/'))) return NextResponse.json({ message: 'Unsupported attachment.' }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ message: 'Attachments must be 2 MB or smaller.' }, { status: 413 });
  try { return NextResponse.json(await uploadAttachment(normalizeRoomCode((await params).code), file)); }
  catch { return NextResponse.json({ message: 'The attachment could not be uploaded.' }, { status: 502 }); }
}
