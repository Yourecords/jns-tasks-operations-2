import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { Show } from '@/lib/types';
import { logAudit } from '@/lib/workflow';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ shows: db.shows });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role === 'TEAM_MEMBER') {
    return NextResponse.json({ error: 'Unauthorized: Only Producers or Admin can manage shows.' }, { status: 403 });
  }

  const data = await req.json();
  const db = getDb();

  if (!data.name || data.name.trim().length === 0) {
    return NextResponse.json({ error: 'Show name is required.' }, { status: 400 });
  }

  const existingIndex = db.shows.findIndex((s) => s.id === data.id);
  if (existingIndex >= 0) {
    db.shows[existingIndex] = {
      ...db.shows[existingIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    logAudit(undefined, user, 'UPDATE_SHOW', `Updated show: ${data.name}`);
    return NextResponse.json({ success: true, show: db.shows[existingIndex] });
  }

  const newShow: Show = {
    id: `show_${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: data.name,
    status: data.status || 'ACTIVE',
    hosts: data.hosts || '',
    producerId: data.producerId || user.id,
    defaultEditorId: data.defaultEditorId,
    defaultGraphicsId: data.defaultGraphicsId,
    recordingDay: data.recordingDay || 'Monday',
    publicationDay: data.publicationDay || 'Tuesday',
    description: data.description || '',
    notes: data.notes,
    createdAt: new Date().toISOString(),
  };

  db.shows.push(newShow);
  saveDb(db);
  logAudit(undefined, user, 'CREATE_SHOW', `Created new show: ${newShow.name}`);
  return NextResponse.json({ success: true, show: newShow });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role === 'TEAM_MEMBER') {
    return NextResponse.json({ error: 'Unauthorized: Only Producers or Admin can modify shows.' }, { status: 403 });
  }

  const data = await req.json();
  const db = getDb();

  if (!data.id) {
    return NextResponse.json({ error: 'Show ID is required for updating.' }, { status: 400 });
  }

  const show = db.shows.find((s) => s.id === data.id);
  if (!show) {
    return NextResponse.json({ error: 'Show not found.' }, { status: 404 });
  }

  if (data.name !== undefined) show.name = data.name.trim();
  if (data.hosts !== undefined) show.hosts = data.hosts.trim();
  if (data.producerId !== undefined) show.producerId = data.producerId;
  if (data.defaultEditorId !== undefined) show.defaultEditorId = data.defaultEditorId || undefined;
  if (data.defaultGraphicsId !== undefined) show.defaultGraphicsId = data.defaultGraphicsId || undefined;
  if (data.recordingDay !== undefined) show.recordingDay = data.recordingDay;
  if (data.publicationDay !== undefined) show.publicationDay = data.publicationDay;
  if (data.status !== undefined) show.status = data.status;
  if (data.description !== undefined) show.description = data.description.trim();
  if (data.notes !== undefined) show.notes = data.notes.trim();

  saveDb(db);
  logAudit(undefined, user, 'UPDATE_SHOW', `${user.name} (${user.role}) modified parameters for show: "${show.name}"`);
  return NextResponse.json({ success: true, show });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role === 'TEAM_MEMBER') {
    return NextResponse.json({ error: 'Unauthorized: Only Administrators and Producers can remove shows.' }, { status: 403 });
  }

  let showId = req.nextUrl.searchParams.get('id');
  if (!showId) {
    try {
      const body = await req.json();
      showId = body.id;
    } catch (e) {}
  }

  if (!showId) {
    return NextResponse.json({ error: 'Show ID is required.' }, { status: 400 });
  }

  const db = getDb();
  const showIndex = db.shows.findIndex((s) => s.id === showId);
  if (showIndex === -1) {
    return NextResponse.json({ error: 'Show not found.' }, { status: 404 });
  }

  const showName = db.shows[showIndex].name;
  db.shows.splice(showIndex, 1);
  saveDb(db);

  logAudit(undefined, user, 'DELETE_SHOW', `${user.name} (${user.role}) removed show "${showName}" from database.`);
  return NextResponse.json({ success: true, message: `Show "${showName}" removed successfully.`, deletedId: showId });
}
