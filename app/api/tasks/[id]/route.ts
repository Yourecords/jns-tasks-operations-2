import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { updateTaskStatus, deleteTask } from '@/lib/workflow';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { id } = await Promise.resolve(context.params);
  const body = await req.json();
  const { status, blockedReason, blockedHelper } = body;

  try {
    const updated = await updateTaskStatus(
      id,
      status,
      user,
      blockedReason,
      blockedHelper
    );
    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update task' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { id } = await Promise.resolve(context.params);
  try {
    const result = await deleteTask(id, user);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to remove task' }, { status });
  }
}
