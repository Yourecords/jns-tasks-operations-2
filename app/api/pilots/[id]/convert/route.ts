import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { convertPilotToShow } from '@/lib/workflow';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }
  const { id } = await Promise.resolve(context.params);
  const body = await req.json();

  try {
    const show = await convertPilotToShow(id, body, user);
    return NextResponse.json({ success: true, show });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Conversion failed' }, { status: 400 });
  }
}
