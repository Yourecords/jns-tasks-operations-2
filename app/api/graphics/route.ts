import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { GraphicDesignTask, GraphicSubtask, GraphicAssetLink } from '@/lib/types';
import { canAccessGraphics } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Restrict visibility: Only Admins, Producers, and Graphic Designers can view graphics tasks
  if (!canAccessGraphics(user)) {
    return NextResponse.json({ tasks: [] });
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

  if (!canAccessGraphics(user)) {
    return NextResponse.json(
      { error: 'Forbidden: Graphics requests and workflows are restricted to Admins, Producers, and Graphic Designers' },
      { status: 403 }
    );
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
      producerId,
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

    // Target producer: Zach/Barbara/Yuri (Yuri default for immediate, Zach default for long-term)
    const isLongTerm = type === 'LONG_TERM';
    const targetProducerId = producerId || (isLongTerm ? 'usr_zach_producer' : 'usr_yuri_admin');
    const assignedProducer = targetProducerId ? db.users.find((u) => u.id === targetProducerId) : undefined;
    const producerDisplayName = assignedProducer?.fullName || assignedProducer?.name || (isLongTerm ? 'Zach Sicherman' : 'Yuri Skvirski');

    // Target assignee: producer for long-term, designer (default Ilia) for immediate
    const targetAssigneeId = isLongTerm ? targetProducerId : (assignedUserId && assignedUserId !== targetProducerId ? assignedUserId : 'usr_ilia_graphics');
    const assignedUser = db.users.find((u) => u.id === targetAssigneeId);

    // Build initial subtasks if long-term project (default subtask designer to Ilia)
    const formattedSubtasks: GraphicSubtask[] = Array.isArray(subtasks)
      ? subtasks.map((s: any, idx: number) => ({
          id: s.id || `sub_${Date.now()}_${idx}`,
          title: s.title || `Subtask ${idx + 1}`,
          status: s.status || 'NOT_STARTED',
          isMainTask: !!s.isMainTask,
          parentId: s.parentId || undefined,
          mainTaskTitle: s.mainTaskTitle || undefined,
          subtasks: Array.isArray(s.subtasks)
            ? s.subtasks.map((child: any, cIdx: number) => ({
                id: child.id || `sub_${Date.now()}_${idx}_${cIdx}`,
                title: child.title || `Subtask ${cIdx + 1}`,
                status: child.status || 'NOT_STARTED',
                isMainTask: false,
                parentId: s.id || `sub_${Date.now()}_${idx}`,
                mainTaskTitle: s.title,
                assignedUserId: child.assignedUserId || 'usr_ilia_graphics',
                createdAt: child.createdAt || new Date().toISOString(),
              }))
            : undefined,
          assignedUserId: s.assignedUserId || 'usr_ilia_graphics',
          notes: s.notes || undefined,
          timing: s.timing || undefined,
          createdAt: s.createdAt || new Date().toISOString(),
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
      type: isLongTerm ? 'LONG_TERM' : 'IMMEDIATE',
      title: mainTitle,
      projectName: isLongTerm ? mainTitle : projectName || undefined,
      showId: showId || undefined,
      showName: showName || undefined,
      productionId: productionId || undefined,
      productionTitle: productionTitle || undefined,
      description: description ? description.trim() : undefined,
      timing: timing ? timing.trim() : undefined,
      deadline: deadline || undefined,
      priority: priority || 'NORMAL',
      status: 'NOT_STARTED',
      assignedUserId: targetAssigneeId,
      assignedUserName: isLongTerm ? producerDisplayName : (assignedUser?.fullName || assignedUser?.name || 'Ilia Molchanov'),
      producerId: targetProducerId,
      producerName: producerDisplayName,
      createdById: user.id,
      createdByName: user.fullName || user.name,
      subtasks: formattedSubtasks,
      assets: formattedAssets,
      references: formattedReferences,
      isArchived: false,
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

    // In-app notification to assignee if different from creator
    if (targetAssigneeId !== user.id) {
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        id: `notif_gfx_${Date.now()}`,
        userId: targetAssigneeId,
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
