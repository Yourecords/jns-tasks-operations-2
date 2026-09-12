import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { submitEquipmentRequest, logAudit } from '@/lib/workflow';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized: Session required" }, { status: 401 });
  const db = await getDbAsync();
  return NextResponse.json({ equipmentRequests: db.equipmentRequests });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const data = await req.json();

  try {
    await submitEquipmentRequest(data, user);
    const db = await getDbAsync();
    return NextResponse.json({ success: true, equipmentRequests: db.equipmentRequests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.role === 'TEAM_MEMBER') {
    return NextResponse.json({ error: 'Unauthorized: Only Administrators or Producers can manage equipment status.' }, { status: 403 });
  }

  const { id, status } = await req.json();
  const db = await getDbAsync();
  const reqItem = db.equipmentRequests.find((e) => e.id === id);
  if (!reqItem) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  reqItem.status = status;
  reqItem.updatedAt = new Date().toISOString();
  await saveDbAsync(db);
  await logAudit(undefined, user, 'UPDATE_EQUIPMENT_STATUS', `Updated equipment "${reqItem.itemName}" to ${status}`);
  return NextResponse.json({ success: true, equipmentRequest: reqItem });
}
