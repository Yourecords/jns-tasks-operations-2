import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { submitEquipmentRequest, logAudit } from '@/lib/workflow';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ equipmentRequests: db.equipmentRequests });
}

export async function POST(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  const data = await req.json();

  try {
    submitEquipmentRequest(data, user);
    const db = getDb();
    return NextResponse.json({ success: true, equipmentRequests: db.equipmentRequests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getAuthenticatedUser(req);
  if (user.role === 'TEAM_MEMBER') {
    return NextResponse.json({ error: 'Unauthorized: Only Administrators or Producers can manage equipment status.' }, { status: 403 });
  }

  const { id, status } = await req.json();
  const db = getDb();
  const reqItem = db.equipmentRequests.find((e) => e.id === id);
  if (!reqItem) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  reqItem.status = status;
  reqItem.updatedAt = new Date().toISOString();
  saveDb(db);
  logAudit(undefined, user, 'UPDATE_EQUIPMENT_STATUS', `Updated equipment "${reqItem.itemName}" to ${status}`);
  return NextResponse.json({ success: true, equipmentRequest: reqItem });
}
