import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { cancelTaxiOrder, updateTaxiStatus } from '@/lib/gett';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { id } = await Promise.resolve(context.params);
  const db = await getDbAsync();
  const ride = db.taxiRides?.find((r) => r.id === id);

  if (!ride) {
    return NextResponse.json({ error: 'Taxi ride not found' }, { status: 404 });
  }

  return NextResponse.json({ ride });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { id } = await Promise.resolve(context.params);
  const body = await req.json();
  const { action, payload } = body;

  try {
    let updated;

    switch (action) {
      case 'CANCEL':
      case 'CANCEL_RIDE':
        updated = await cancelTaxiOrder(id, user, payload?.reason || body.reason);
        break;

      case 'UPDATE_STATUS':
        updated = await updateTaxiStatus(
          id,
          payload?.status || body.status,
          payload?.actualPrice || body.actualPrice
        );
        break;

      case 'UPDATE_NOTES': {
        const db = await getDbAsync();
        const ride = db.taxiRides?.find((r) => r.id === id);
        if (!ride) {
          return NextResponse.json({ error: 'Taxi ride not found' }, { status: 404 });
        }
        ride.notes = payload?.notes || body.notes || '';
        ride.updatedAt = new Date().toISOString();
        await saveDbAsync(db);
        updated = ride;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, ride: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update taxi ride' }, { status: 400 });
  }
}
