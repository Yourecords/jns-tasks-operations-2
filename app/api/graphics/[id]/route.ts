import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDbAsync();
  const task = (db.graphicDesignTasks || []).find((t) => t.id === id);

  if (!task) {
    return NextResponse.json({ error: 'Graphic task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const db = await getDbAsync();
    const tasks = db.graphicDesignTasks || [];
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Graphic task not found' }, { status: 404 });
    }

    const task = tasks[index];

    // Update allowed fields
    if (body.title !== undefined) task.title = body.title.trim();
    if (body.projectName !== undefined) task.projectName = body.projectName.trim();
    if (body.showName !== undefined) task.showName = body.showName.trim();
    if (body.description !== undefined) task.description = body.description.trim();
    if (body.timing !== undefined) task.timing = body.timing.trim();
    if (body.deadline !== undefined) task.deadline = body.deadline;
    if (body.priority !== undefined) task.priority = body.priority;
    if (body.deliverableUrl !== undefined) task.deliverableUrl = body.deliverableUrl.trim();
    if (Array.isArray(body.assets)) task.assets = body.assets;
    if (Array.isArray(body.references)) task.references = body.references;

    if (body.status !== undefined) {
      task.status = body.status;
      if (body.status === 'COMPLETED') {
        task.completedAt = new Date().toISOString();
      }
    }

    if (body.assignedUserId !== undefined) {
      task.assignedUserId = body.assignedUserId;
      const assigned = db.users.find((u) => u.id === body.assignedUserId);
      if (assigned) {
        task.assignedUserName = assigned.fullName || assigned.name;
      }
    }

    // Direct subtask status or subtask array update
    if (Array.isArray(body.subtasks)) {
      task.subtasks = body.subtasks;
    }

    task.updatedAt = new Date().toISOString();
    await saveDbAsync(db);

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const db = await getDbAsync();
    const beforeCount = (db.graphicDesignTasks || []).length;
    db.graphicDesignTasks = (db.graphicDesignTasks || []).filter((t) => t.id !== id);

    if (db.graphicDesignTasks.length === beforeCount) {
      return NextResponse.json({ error: 'Graphic task not found' }, { status: 404 });
    }

    await saveDbAsync(db);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete task' }, { status: 500 });
  }
}
