import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { updateTaskStatus, deleteTask } from '@/lib/workflow';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthenticatedUser(req);
  const body = await req.json();
  const { status, blockedReason, blockedHelper } = body;

  try {
    const updated = updateTaskStatus(
      params.id,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthenticatedUser(req);
  try {
    const result = deleteTask(params.id, user);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to remove task' }, { status });
  }
}

