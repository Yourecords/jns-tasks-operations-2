import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { GraphicDesignTask, GraphicSubtask, GraphicAssetLink } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const assignedUserId = searchParams.get('assignedUserId');
  const showId = searchParams.get('showId');

  const db = await getDbAsync();
  let tasks = db.graphicDesignTasks || [];

  if (type) {
    tasks = tasks.filter((t) => t.type === type);
  }
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (assignedUserId) {
    tasks = tasks.filter((t) => t.assignedUserId === assignedUserId);
  }
  if (showId) {
    tasks = tasks.filter((t) => t.showId === showId);
  }

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      type = 'IMMEDIATE',
      title,
      projectName,
      showId,
      showName,
      productionId,
      productionTitle,
      description,
      timing,
      deadline,
      priority = 'NORMAL',
      assignedUserId,
      subtasks = [],
      assets = [],
      references = [],
    } = body;

    const mainTitle = (title || projectName || '').trim();
    if (!mainTitle) {
      return NextResponse.json(
        { error: type === 'LONG_TERM' ? 'Project name is required' : 'Graphic request title is required' },
        { status: 400 }
      );
    }

    const db = await getDbAsync();
    if (!db.graphicDesignTasks) {
      db.graphicDesignTasks = [];
    }

    // Default assigned designer to Ilia Molchanov if none provided
    const targetDesignerId = assignedUserId || 'usr_ilia_graphics';
    const assignedUser = db.users.find((u) => u.id === targetDesignerId);

    // Build initial subtasks if long-term project
    const formattedSubtasks: GraphicSubtask[] = Array.isArray(subtasks)
      ? subtasks.map((s: any, idx: number) => ({
          id: s.id || `sub_${Date.now()}_${idx}`,
          title: s.title || `Subtask ${idx + 1}`,
          status: s.status || 'NOT_STARTED',
          assignedUserId: s.assignedUserId || targetDesignerId,
          notes: s.notes || undefined,
          timing: s.timing || undefined,
          createdAt: new Date().toISOString(),
        }))
      : [];

    // Format asset & reference links
    const formattedAssets: GraphicAssetLink[] = Array.isArray(assets)
      ? assets
          .filter((a: any) => a && (typeof a === 'string' ? a.trim() : a.url?.trim()))
          .map((a: any, idx: number) => ({
            id: a.id || `ast_${Date.now()}_${idx}`,
            title: a.title || (typeof a === 'string' ? 'Asset Link' : a.url),
            url: typeof a === 'string' ? a.trim() : a.url.trim(),
            type: 'ASSET',
            addedByUserId: user.id,
            addedAt: new Date().toISOString(),
          }))
      : [];

    const formattedReferences: GraphicAssetLink[] = Array.isArray(references)
      ? references
          .filter((r: any) => r && (typeof r === 'string' ? r.trim() : r.url?.trim()))
          .map((r: any, idx: number) => ({
            id: r.id || `ref_${Date.now()}_${idx}`,
            title: r.title || (typeof r === 'string' ? 'Reference Link' : r.url),
            url: typeof r === 'string' ? r.trim() : r.url.trim(),
            type: 'REFERENCE',
            addedByUserId: user.id,
            addedAt: new Date().toISOString(),
          }))
      : [];

    const newTask: GraphicDesignTask = {
      id: `gfx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: type === 'LONG_TERM' ? 'LONG_TERM' : 'IMMEDIATE',
      title: mainTitle,
      projectName: type === 'LONG_TERM' ? mainTitle : projectName || undefined,
      showId: showId || undefined,
      showName: showName || undefined,
      productionId: productionId || undefined,
      productionTitle: productionTitle || undefined,
      description: description ? description.trim() : undefined,
      timing: timing ? timing.trim() : undefined,
      deadline: deadline || undefined,
      priority: priority || 'NORMAL',
      status: 'NOT_STARTED',
      assignedUserId: targetDesignerId,
      assignedUserName: assignedUser?.fullName || assignedUser?.name || 'Assigned Designer',
      createdById: user.id,
      createdByName: user.fullName || user.name,
      subtasks: formattedSubtasks,
      assets: formattedAssets,
      references: formattedReferences,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.graphicDesignTasks.unshift(newTask);

    // Audit log
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift({
      id: `log_gfx_${Date.now()}`,
      productionId: productionId || undefined,
      userId: user.id,
      userName: user.name,
      action: 'CREATE_GRAPHIC_TASK',
      details: `Created ${newTask.type} graphic task "${newTask.title}" assigned to ${newTask.assignedUserName}.`,
      timestamp: new Date().toISOString(),
    });

    // In-app notification to designer if different from creator
    if (targetDesignerId !== user.id) {
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        id: `notif_gfx_${Date.now()}`,
        userId: targetDesignerId,
        title: `New Graphic Task Assigned: ${newTask.title}`,
        message: `${user.name} assigned you to ${newTask.type === 'LONG_TERM' ? 'Long-Term Project' : 'Show Graphic'} "${newTask.title}".`,
        linkUrl: '/graphics',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    await saveDbAsync(db);

    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create graphic design task' }, { status: 500 });
  }
}
