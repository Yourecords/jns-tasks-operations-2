import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { createNewEpisode, createNewPilot, createNewRental, deleteProduction } from '@/lib/workflow';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const showId = searchParams.get('showId');
  const status = searchParams.get('status');
  const stage = searchParams.get('stage');
  const search = searchParams.get('search')?.toLowerCase();
  const assignedTo = searchParams.get('assignedTo');

  const db = getDb();
  let list = db.productions;

  if (type) {
    list = list.filter((p) => p.type === type);
  }
  if (showId) {
    list = list.filter((p) => p.showId === showId);
  }
  if (status) {
    list = list.filter((p) => p.status === status);
  }
  if (stage) {
    list = list.filter((p) => p.currentStage === stage);
  }
  if (assignedTo) {
    list = list.filter(
      (p) =>
        p.producerId === assignedTo ||
        p.editorId === assignedTo ||
        p.graphicsId === assignedTo ||
        p.tasks.some((t) => t.assignedUserId === assignedTo)
    );
  }
  if (search) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        (p.episodeNumber && p.episodeNumber.toLowerCase().includes(search)) ||
        (p.rentalDetails && p.rentalDetails.clientName.toLowerCase().includes(search))
    );
  }

  return NextResponse.json({ productions: list });
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  const body = await req.json();
  const { action, ...data } = body;

  try {
    if (action === 'CREATE_EPISODE') {
      const created = createNewEpisode(data, user);
      return NextResponse.json({ success: true, production: created });
    } else if (action === 'CREATE_PILOT') {
      const created = createNewPilot(data, user);
      return NextResponse.json({ success: true, production: created });
    } else if (action === 'CREATE_RENTAL') {
      const created = createNewRental(data, user);
      return NextResponse.json({ success: true, production: created });
    } else {
      return NextResponse.json({ error: 'Unknown creation action' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  const { searchParams } = new URL(req.url);
  let id = searchParams.get('id');

  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = body.id;
  }

  if (!id) {
    return NextResponse.json({ error: 'Production ID is required.' }, { status: 400 });
  }

  try {
    const result = deleteProduction(id, user);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to remove production' }, { status });
  }
}

