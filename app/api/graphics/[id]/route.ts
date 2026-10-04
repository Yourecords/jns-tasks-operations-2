import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { canAccessGraphics } from '@/lib/utils';
import { GraphicStatusNote } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canAccessGraphics(user)) {
    return NextResponse.json(
      { error: 'Forbidden: Graphics tasks are restricted to Admins, Producers, and Graphic Designers' },
      { status: 403 }
    );
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

  if (!canAccessGraphics(user)) {
    return NextResponse.json(
      { error: 'Forbidden: Graphics tasks are restricted to Admins, Producers, and Graphic Designers' },
      { status: 403 }
    );
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

    const oldStatus = task.status;
    const noteText =
      typeof body.statusNote === 'string'
        ? body.statusNote.trim()
        : typeof body.note === 'string'
        ? body.note.trim()
        : '';

    if (!task.statusNotes) task.statusNotes = [];

    const targetProducerId =
      task.producerId || (task.type === 'LONG_TERM' ? 'usr_zach_producer' : 'usr_yuri_admin');

    if (body.isArchived !== undefined) {
      task.isArchived = !!body.isArchived;
      task.archivedAt = body.isArchived ? new Date().toISOString() : undefined;
    }

    // Normalized status
    let targetStatus = body.status;
    if (targetStatus === 'AWAITING_APPROVAL') targetStatus = 'READY_FOR_REVIEW';
    if (body.action === 'APPROVE') targetStatus = 'COMPLETED';
    if (body.action === 'REVISION_REQUIRED') targetStatus = 'REVISION_REQUIRED';

    if (targetStatus !== undefined && targetStatus !== oldStatus) {
      task.status = targetStatus;

      // 1. SUBMISSION FOR REVIEW -> Change to Awaiting Approval & Add review task for producer
      if (targetStatus === 'READY_FOR_REVIEW') {
        task.reviewTask = {
          id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          producerId: targetProducerId,
          producerName: task.producerName,
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
          submittedByUserId: user.id,
          submittedByUserName: user.name,
        };

        if (targetProducerId && targetProducerId !== user.id) {
          if (!db.notifications) db.notifications = [];
          db.notifications.unshift({
            id: `notif_gfx_rev_req_${Date.now()}`,
            userId: targetProducerId,
            title: `Graphics Review Required: ${task.title || task.projectName} (Awaiting Approval)`,
            message: `${user.name} submitted graphics for your review. Please review and approve or request revisions.`,
            linkUrl: '/graphics',
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 2. PRODUCER APPROVAL -> Complete, Archive, and notify designer
      if (targetStatus === 'COMPLETED') {
        task.completedAt = new Date().toISOString();
        task.isArchived = true;
        task.archivedAt = new Date().toISOString();
        if (task.reviewTask) {
          task.reviewTask.status = 'APPROVED';
          task.reviewTask.reviewedAt = new Date().toISOString();
          task.reviewTask.reviewNotes = noteText || 'Approved';
        }

        // Notify designer
        if (task.assignedUserId && task.assignedUserId !== user.id) {
          if (!db.notifications) db.notifications = [];
          db.notifications.unshift({
            id: `notif_gfx_appr_${Date.now()}`,
            userId: task.assignedUserId,
            title: `Graphics Approved & Archived: ${task.title || task.projectName}`,
            message: `${user.name} approved your graphics submission. The task has been completed and archived.`,
            linkUrl: '/graphics',
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 3. PRODUCER REVISION REQUIRED -> Save review, add asset/reference placeholders, and notify designer
      if (targetStatus === 'REVISION_REQUIRED') {
        const reviewComment = body.reviewNotes || noteText || 'Revisions required by producer';
        task.reviewNotes = reviewComment;
        if (task.reviewTask) {
          task.reviewTask.status = 'REVISION_REQUESTED';
          task.reviewTask.reviewedAt = new Date().toISOString();
          task.reviewTask.reviewNotes = reviewComment;
        }

        if (!task.assets) task.assets = [];
        if (!task.references) task.references = [];

        // Additional assets from producer
        if (Array.isArray(body.additionalAssets)) {
          body.additionalAssets.forEach((ast: any) => {
            if (ast.url || ast.title) {
              task.assets.push({
                id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: ast.title || 'Additional Asset Requested',
                url: ast.url || '',
                addedByUserId: user.id,
                addedAt: new Date().toISOString(),
              });
            }
          });
        }

        // Additional references from producer
        if (Array.isArray(body.additionalReferences)) {
          body.additionalReferences.forEach((ref: any) => {
            if (ref.url || ref.title) {
              task.references.push({
                id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: ref.title || 'Additional Reference Inspiration',
                url: ref.url || '',
                addedByUserId: user.id,
                addedAt: new Date().toISOString(),
              });
            }
          });
        }

        // Ensure additional placeholders for assets and references are added
        const hasAssetPlaceholder = task.assets.some((a) => !a.url || a.title?.toLowerCase().includes('placeholder'));
        if (!hasAssetPlaceholder) {
          task.assets.push({
            id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: 'Additional Asset (Placeholder)',
            url: '',
            addedByUserId: user.id,
            addedAt: new Date().toISOString(),
          });
        }

        const hasRefPlaceholder = task.references.some((r) => !r.url || r.title?.toLowerCase().includes('placeholder'));
        if (!hasRefPlaceholder) {
          task.references.push({
            id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: 'Additional Reference (Placeholder)',
            url: '',
            addedByUserId: user.id,
            addedAt: new Date().toISOString(),
          });
        }

        // Notify designer
        if (task.assignedUserId && task.assignedUserId !== user.id) {
          if (!db.notifications) db.notifications = [];
          db.notifications.unshift({
            id: `notif_gfx_rev_${Date.now()}`,
            userId: task.assignedUserId,
            title: `Revisions Requested: ${task.title || task.projectName}`,
            message: `${user.name} reviewed your submission: "${reviewComment}". Additional asset and reference placeholders have been added.`,
            linkUrl: '/graphics',
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Record status note entry
      const statusNoteEntry: GraphicStatusNote = {
        id: `sn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fromStatus: oldStatus,
        toStatus: targetStatus,
        note: noteText || (targetStatus === 'READY_FOR_REVIEW' ? 'Submitted for producer review (Awaiting Approval)' : targetStatus === 'COMPLETED' ? 'Approved and archived' : ''),
        authorId: user.id,
        authorName: user.name,
        producerId: task.producerId,
        producerName: task.producerName,
        createdAt: new Date().toISOString(),
      };
      task.statusNotes.unshift(statusNoteEntry);
      if (noteText) {
        task.latestNote = noteText;
      }

      // Generic notification to producer for other status changes (e.g. IN_PROGRESS)
      if (targetStatus !== 'READY_FOR_REVIEW' && targetStatus !== 'COMPLETED' && targetStatus !== 'REVISION_REQUIRED') {
        if (targetProducerId && targetProducerId !== user.id) {
          if (!db.notifications) db.notifications = [];
          db.notifications.unshift({
            id: `notif_gfx_note_${Date.now()}`,
            userId: targetProducerId,
            title: `Graphics Status: ${task.title || task.projectName} (${targetStatus.replace(/_/g, ' ')})`,
            message: noteText
              ? `${user.name} (${targetStatus.replace(/_/g, ' ')}): "${noteText}"`
              : `${user.name} changed status to ${targetStatus.replace(/_/g, ' ')}.`,
            linkUrl: '/graphics',
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else if (noteText) {
      // Adding a direct note to producer without changing status
      const statusNoteEntry: GraphicStatusNote = {
        id: `sn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        toStatus: task.status,
        note: noteText,
        authorId: user.id,
        authorName: user.name,
        producerId: task.producerId,
        producerName: task.producerName,
        createdAt: new Date().toISOString(),
      };
      task.statusNotes.unshift(statusNoteEntry);
      task.latestNote = noteText;

      if (targetProducerId && targetProducerId !== user.id) {
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift({
          id: `notif_gfx_note_${Date.now()}`,
          userId: targetProducerId,
          title: `Note on Graphics Task: ${task.title || task.projectName}`,
          message: `${user.name} to ${task.producerName || 'Producer'}: "${noteText}"`,
          linkUrl: '/graphics',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (Array.isArray(body.statusNotes)) {
      task.statusNotes = body.statusNotes;
    }

    if (body.producerId !== undefined) {
      task.producerId = body.producerId;
      const producer = db.users.find((u) => u.id === body.producerId);
      if (producer) {
        task.producerName = producer.fullName || producer.name;
      }
    }

    if (body.assignedUserId !== undefined) {
      task.assignedUserId = body.assignedUserId;
      const assigned = db.users.find((u) => u.id === body.assignedUserId);
      if (assigned) {
        task.assignedUserName = assigned.fullName || assigned.name;
        if (task.type === 'LONG_TERM' && !body.producerId) {
          task.producerId = body.assignedUserId;
          task.producerName = task.assignedUserName;
        }
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

  if (!canAccessGraphics(user)) {
    return NextResponse.json(
      { error: 'Forbidden: Graphics tasks are restricted to Admins, Producers, and Graphic Designers' },
      { status: 403 }
    );
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
