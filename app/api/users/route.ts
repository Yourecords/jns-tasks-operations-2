import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { logAudit } from '@/lib/workflow';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ users: db.users });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PRODUCER')) {
    return NextResponse.json(
      { error: 'Unauthorized: Only Administrators and Producers can add team members.' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, fullName, email, position, memberType } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'User Name is required.' }, { status: 400 });
  }

  const db = getDb();
  const trimmedName = name.trim();
  const cleanEmail = (email && email.trim()) ? email.trim() : `${trimmedName.toLowerCase().replace(/\s+/g, '')}@jns.org`;

  // Map position to jobFunction, role, and positionDisplay
  let jobFunction = 'VIDEO_EDITOR';
  let role = 'TEAM_MEMBER';
  let positionDisplay = 'Video Editor';

  const posLower = (position || '').toLowerCase();
  if (posLower.includes('producer')) {
    jobFunction = 'PRODUCER';
    role = 'PRODUCER';
    positionDisplay = 'Producer';
  } else if (posLower.includes('editor')) {
    jobFunction = 'VIDEO_EDITOR';
    role = 'TEAM_MEMBER';
    positionDisplay = 'Video Editor';
  } else if (posLower.includes('camera')) {
    jobFunction = 'CAMERAMAN';
    role = 'TEAM_MEMBER';
    positionDisplay = 'Cameraman';
  } else if (posLower.includes('graphic')) {
    jobFunction = 'MOTION_GRAPHICS_DESIGNER';
    role = 'TEAM_MEMBER';
    positionDisplay = 'Graphics';
  } else if (posLower.includes('admin') || posLower.includes('head') || posLower.includes('director')) {
    jobFunction = 'HEAD_OF_PRODUCTION';
    role = 'ADMIN';
    positionDisplay = 'Admin';
  }

  const safeHandle = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const newId = `usr_${safeHandle}_${Date.now().toString().slice(-4)}`;

  const newUser = {
    id: newId,
    name: trimmedName,
    fullName: fullName?.trim() || trimmedName,
    email: cleanEmail,
    role: role as any,
    jobFunction: jobFunction as any,
    positionDisplay,
    memberType: (memberType === 'TEMPORARY' ? 'TEMPORARY' : 'STAFF') as any,
    isActive: true,
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);

  logAudit(
    undefined,
    user,
    'CREATE_USER',
    `${user.name} (${user.role}) added user ${newUser.name} [${newUser.fullName}] as ${newUser.positionDisplay} (${newUser.memberType})`
  );

  return NextResponse.json({ success: true, user: newUser }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PRODUCER')) {
    return NextResponse.json(
      { error: 'Unauthorized: Only Administrators and Producers can modify user permissions.' },
      { status: 403 }
    );
  }

  const { id, role, jobFunction, positionDisplay, memberType, isActive } = await req.json();
  const db = getDb();
  const targetUser = db.users.find((u) => u.id === id);
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (role) targetUser.role = role;
  if (jobFunction) targetUser.jobFunction = jobFunction;
  if (positionDisplay) targetUser.positionDisplay = positionDisplay;
  if (memberType) targetUser.memberType = memberType;
  if (typeof isActive === 'boolean') targetUser.isActive = isActive;

  saveDb(db);
  logAudit(
    undefined,
    user,
    'UPDATE_USER_PERMISSIONS',
    `Updated user ${targetUser.name} to role=${targetUser.role}, function=${targetUser.jobFunction}, position=${targetUser.positionDisplay}`
  );
  return NextResponse.json({ success: true, user: targetUser });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'PRODUCER')) {
    return NextResponse.json(
      { error: 'Unauthorized: Only Administrators and Producers can remove users.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  let id = searchParams.get('id');

  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = body.id;
  }

  if (!id) {
    return NextResponse.json({ error: 'User ID is required to remove user.' }, { status: 400 });
  }

  if (id === 'usr_yuri_admin') {
    return NextResponse.json(
      { error: 'Cannot remove primary system administrator (Yuri).' },
      { status: 400 }
    );
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: 'You cannot remove your own active user account.' },
      { status: 400 }
    );
  }

  const db = getDb();
  const targetUser = db.users.find((u) => u.id === id);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found in system.' }, { status: 404 });
  }

  db.users = db.users.filter((u) => u.id !== id);
  saveDb(db);

  logAudit(
    undefined,
    user,
    'DELETE_USER',
    `${user.name} (${user.role}) removed user "${targetUser.name}" [${targetUser.fullName || targetUser.name}] (${targetUser.email}) from the system.`
  );

  return NextResponse.json({
    success: true,
    message: `User ${targetUser.name} (${targetUser.email}) removed successfully.`,
  });
}
