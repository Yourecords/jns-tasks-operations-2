import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { ShowIdea } from '@/lib/types';
import { logAudit } from '@/lib/workflow';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ showIdeas: db.showIdeas });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const data = await req.json();

  if (!data.showName || !data.concept || !data.whyJnsShouldMakeIt) {
    return NextResponse.json({ error: 'Please provide Show Name, Concept, and Why JNS Should Make It.' }, { status: 400 });
  }

  const db = getDb();
  const newIdea: ShowIdea = {
    id: `idea_${Date.now()}`,
    showName: data.showName.trim(),
    concept: data.concept.trim(),
    whyJnsShouldMakeIt: data.whyJnsShouldMakeIt.trim(),
    targetAudience: data.targetAudience?.trim() || '',
    suggestedHost: data.suggestedHost?.trim(),
    suggestedFormat: data.suggestedFormat?.trim() || 'Studio Show',
    suggestedLength: data.suggestedLength?.trim() || '25 min',
    frequency: data.frequency?.trim(),
    examplesLinks: data.examplesLinks || [],
    additionalNotes: data.additionalNotes?.trim(),
    submittedById: user.id,
    submittedByName: user.name,
    category: data.category || 'Studio Show',
    status: 'NEW',
    createdAt: new Date().toISOString(),
  };

  db.showIdeas.unshift(newIdea);
  saveDb(db);
  logAudit(undefined, user, 'CREATE_SHOW_IDEA', `Submitted new show idea: "${newIdea.showName}"`);
  return NextResponse.json({ success: true, idea: newIdea });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role === 'TEAM_MEMBER') {
    return NextResponse.json({ error: 'Unauthorized: Only Producers or Admin can update idea status.' }, { status: 403 });
  }

  const { id, status } = await req.json();
  const db = getDb();
  const idea = db.showIdeas.find((i) => i.id === id);
  if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });

  idea.status = status;
  saveDb(db);
  logAudit(undefined, user, 'UPDATE_SHOW_IDEA_STATUS', `Updated status of "${idea.showName}" to ${status}`);
  return NextResponse.json({ success: true, idea });
}
