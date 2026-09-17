import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  const showId = searchParams.get('showId');
  const type = searchParams.get('type');
  const assignedTo = searchParams.get('assignedTo');

  const db = await getDbAsync();

  // Active editors for the editing columns
  const editors = db.users.filter(
    (u) =>
      u.isActive !== false &&
      (u.jobFunction === 'VIDEO_EDITOR' ||
        u.id === 'usr_ryan_editor' ||
        u.id === 'usr_olga_editor' ||
        u.id === 'usr_ksenia_editor')
  );

  let productions = db.productions.filter((p) => p.status !== 'ARCHIVED');

  if (showId) {
    productions = productions.filter((p) => p.showId === showId);
  }
  if (type) {
    productions = productions.filter((p) => p.type === type);
  }
  if (assignedTo) {
    productions = productions.filter(
      (p) => p.producerId === assignedTo || p.editorId === assignedTo
    );
  }

  // Meetings
  let meetings = db.meetings || [];
  if (startDate && endDate) {
    meetings = meetings.filter((m) => m.date >= startDate && m.date <= endDate);
  }

  return NextResponse.json({
    productions,
    meetings,
    shows: db.shows,
    editors,
    users: db.users.filter((u) => u.isActive !== false),
  });
}
