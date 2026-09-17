import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getDbAsync } from '@/lib/db';
import {
  createTaxiOrder,
  estimateTaxiPrice,
  JNS_STUDIO_ADDRESS,
  CreateTaxiOrderParams,
} from '@/lib/gett';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productionId = searchParams.get('productionId');
  const status = searchParams.get('status');

  const db = await getDbAsync();
  let rides = Array.isArray(db.taxiRides) ? [...db.taxiRides] : [];

  if (productionId) {
    rides = rides.filter((r) => r.productionId === productionId);
  }
  if (status) {
    rides = rides.filter((r) => r.status === status);
  }

  const activeCount = (db.taxiRides || []).filter(
    (r) => r.status === 'DISPATCHED' || r.status === 'ARRIVED' || r.status === 'IN_TRANSIT'
  ).length;

  const scheduledCount = (db.taxiRides || []).filter((r) => r.status === 'REQUESTED').length;
  const completedCount = (db.taxiRides || []).filter((r) => r.status === 'COMPLETED').length;

  return NextResponse.json({
    rides,
    activeCount,
    scheduledCount,
    completedCount,
    studioAddress: JNS_STUDIO_ADDRESS,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Check if this is an estimation request
    if (body.action === 'ESTIMATE') {
      const { pickupAddress, dropoffAddress, vehicleType } = body;
      if (!pickupAddress || !dropoffAddress) {
        return NextResponse.json({ error: 'Pickup and dropoff addresses required for estimate' }, { status: 400 });
      }
      const estimate = estimateTaxiPrice(pickupAddress, dropoffAddress, vehicleType);
      return NextResponse.json({ success: true, estimate });
    }

    const params: CreateTaxiOrderParams = {
      productionId: body.productionId,
      productionTitle: body.productionTitle,
      passengerName: body.passengerName,
      passengerPhone: body.passengerPhone,
      passengerRole: body.passengerRole,
      pickupAddress: body.pickupAddress,
      dropoffAddress: body.dropoffAddress,
      direction: body.direction,
      scheduledTime: body.scheduledTime,
      isImmediate: body.isImmediate,
      vehicleType: body.vehicleType,
      notes: body.notes,
      costCenter: body.costCenter,
    };

    const newRide = await createTaxiOrder(params, user);
    return NextResponse.json({ success: true, ride: newRide }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process taxi request' }, { status: 400 });
  }
}
