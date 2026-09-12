import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { Comment } from '@/lib/types';
import { logAudit } from '@/lib/workflow';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { productionId, taskId, content } = await req.json();

  if (!productionId || !content || content.trim().length === 0) {
    return NextResponse.json({ error: 'Comment content is required.' }, { status: 400 });
  }

  const db = await getDbAsync();
  const newComment: Comment = {
    id: `cmt_${Date.now()}`,
    productionId,
    taskId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  db.comments.push(newComment);
  await saveDbAsync(db);
  await logAudit(productionId, user, 'ADD_COMMENT', `Added comment on production: "${content.slice(0, 50)}..."`);
  return NextResponse.json({ success: true, comment: newComment });
}
