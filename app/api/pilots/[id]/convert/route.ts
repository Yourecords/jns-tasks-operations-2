import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { convertPilotToShow } from '@/lib/workflow';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthenticatedUser(req);
  const body = await req.json();

  try {
    const show = convertPilotToShow(params.id, body, user);
    return NextResponse.json({ success: true, show });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Conversion failed' }, { status: 400 });
  }
}
