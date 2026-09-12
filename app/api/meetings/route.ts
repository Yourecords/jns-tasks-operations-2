import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { Meeting, MeetingActionItem } from '@/lib/types';
import { logAudit } from '@/lib/workflow';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized: Session required" }, { status: 401 });
  const db = await getDbAsync();
  // Newest first
  const sorted = [...db.meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return NextResponse.json({ meetings: sorted });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role === 'TEAM_MEMBER') {
    return NextResponse.json({ error: 'Unauthorized: Only Producers or Admin can create meeting summaries.' }, { status: 403 });
  }

  const data = await req.json();
  const db = await getDbAsync();

  const meetingId = `mtg_${Date.now()}`;
  const actionItems: MeetingActionItem[] = (data.actionItems || []).map(
    (item: any, idx: number) => ({
      id: `act_${meetingId}_${idx + 1}`,
      meetingId,
      task: item.task,
      ownerId: item.ownerId || user.id,
      ownerName: item.ownerName || user.name,
      deadline: item.deadline || new Date().toISOString().split('T')[0],
      status: item.status || 'PENDING',
      links: item.links || [],
    })
  );

  const newMeeting: Meeting = {
    id: meetingId,
    title: data.title,
    date: data.date || new Date().toISOString().split('T')[0],
    participants: data.participants || '',
    writtenById: user.id,
    writtenByName: user.name,
    summary: data.summary,
    topicsDiscussed: data.topicsDiscussed,
    decisionsMade: data.decisionsMade,
    whatChanged: data.whatChanged || '',
    nextSteps: data.nextSteps || '',
    importantLinks: data.importantLinks || [],
    actionItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.meetings.unshift(newMeeting);
  await saveDbAsync(db);
  await logAudit(undefined, user, 'CREATE_MEETING', `Created meeting summary: "${newMeeting.title}"`);
  return NextResponse.json({ success: true, meeting: newMeeting });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }
  const body = await req.json();
  const { meetingId, actionItemId, status } = body;

  const db = await getDbAsync();
  const meeting = db.meetings.find((m) => m.id === meetingId);
  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

  const item = meeting.actionItems.find((a) => a.id === actionItemId);
  if (!item) return NextResponse.json({ error: 'Action item not found' }, { status: 404 });

  item.status = status;
  meeting.updatedAt = new Date().toISOString();
  await saveDbAsync(db);

  await logAudit(undefined, user, 'UPDATE_ACTION_ITEM', `Updated action item "${item.task}" to ${status}`);
  return NextResponse.json({ success: true, meeting });
}
