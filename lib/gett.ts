import { getDbAsync, saveDbAsync } from './db';
import { TaxiRide, TaxiVehicleType, TaxiDirection, TaxiPassengerRole, TaxiStatus, User } from './types';
import { logAudit } from './workflow';

export const JNS_STUDIO_ADDRESS = 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem';

export interface CreateTaxiOrderParams {
  productionId?: string;
  productionTitle?: string;
  passengerName: string;
  passengerPhone: string;
  passengerRole?: TaxiPassengerRole;
  pickupAddress: string;
  dropoffAddress: string;
  direction: TaxiDirection;
  scheduledTime?: string; // ISO string or empty for immediate
  isImmediate?: boolean;
  vehicleType?: TaxiVehicleType;
  notes?: string;
  costCenter?: string;
}

const DRIVER_POOL = [
  { name: 'Yossi Mizrahi', phone: '+972-50-9988776', carModel: 'White Skoda Octavia', platePrefix: '34-567-89' },
  { name: 'Avi Cohen', phone: '+972-52-8877665', carModel: 'Silver Toyota Prius Hybrid', platePrefix: '45-678-90' },
  { name: 'Moshe Levi', phone: '+972-54-7766554', carModel: 'Black Hyundai Ioniq', platePrefix: '12-345-67' },
  { name: 'Ronen Ben-David', phone: '+972-53-6655443', carModel: 'Grey Kia Niro Hybrid', platePrefix: '78-901-23' },
  { name: 'Eli Hadad', phone: '+972-50-5544332', carModel: 'Dark Blue Mercedes E-Class', platePrefix: '89-012-34' },
  { name: 'David Alon', phone: '+972-52-4433221', carModel: 'Mercedes V-Class Executive Van', platePrefix: '90-123-45' },
];

/**
 * Calculates estimated taxi fare in New Israeli Shekels (NIS) and ETA.
 */
export function estimateTaxiPrice(
  pickupAddress: string,
  dropoffAddress: string,
  vehicleType: TaxiVehicleType = 'REGULAR'
): { estimatedPriceShekels: number; estimatedDurationMinutes: number; etaMinutes: number } {
  const text = `${pickupAddress} ${dropoffAddress}`.toLowerCase();

  let baseFare = 65;
  let duration = 20;

  if (text.includes('airport') || text.includes('ben gurion') || text.includes('natbag')) {
    baseFare = 310;
    duration = 50;
  } else if (text.includes('tel aviv') || text.includes('ramat gan') || text.includes('herzliya')) {
    baseFare = 340;
    duration = 65;
  } else if (text.includes('dead sea') || text.includes('ein gedi')) {
    baseFare = 450;
    duration = 75;
  } else if (text.includes('haifa')) {
    baseFare = 620;
    duration = 110;
  } else if (
    text.includes('king david') ||
    text.includes('orient') ||
    text.includes('mamilla') ||
    text.includes('walldorf') ||
    text.includes('inbal') ||
    text.includes('city tower') ||
    text.includes('old city') ||
    text.includes('rehavia') ||
    text.includes('talbiyeh')
  ) {
    baseFare = 55;
    duration = 15;
  }

  // Vehicle multipliers
  let multiplier = 1.0;
  if (vehicleType === 'XL') multiplier = 1.35;
  if (vehicleType === 'PREMIUM') multiplier = 1.25;

  const estimatedPriceShekels = Math.round(baseFare * multiplier);
  const etaMinutes = Math.floor(Math.random() * 5) + 3; // 3 to 7 mins

  return {
    estimatedPriceShekels,
    estimatedDurationMinutes: duration,
    etaMinutes,
  };
}

/**
 * Dispatches or schedules a Gett taxi for a guest/host.
 */
export async function createTaxiOrder(
  params: CreateTaxiOrderParams,
  user: User
): Promise<TaxiRide> {
  if (!params.passengerName || !params.passengerName.trim()) {
    throw new Error('Passenger name is required.');
  }
  if (!params.passengerPhone || !params.passengerPhone.trim()) {
    throw new Error('Passenger phone number is required for driver SMS updates.');
  }
  if (!params.pickupAddress || !params.pickupAddress.trim()) {
    throw new Error('Pickup address is required.');
  }
  if (!params.dropoffAddress || !params.dropoffAddress.trim()) {
    throw new Error('Dropoff address is required.');
  }

  const db = await getDbAsync();
  const vehicleType = params.vehicleType || 'REGULAR';
  const estimate = estimateTaxiPrice(params.pickupAddress, params.dropoffAddress, vehicleType);

  const isImmediate = params.isImmediate !== false && !params.scheduledTime;
  const scheduledTime = params.scheduledTime || new Date().toISOString();

  const rideId = `ride_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const gettOrderId = `gett_ord_${Math.floor(100000 + Math.random() * 900000)}`;

  // Pick random driver for immediate rides or mock dispatch
  const driverTemplate =
    vehicleType === 'XL'
      ? DRIVER_POOL[5]
      : DRIVER_POOL[Math.floor(Math.random() * (DRIVER_POOL.length - 1))];

  const driver = isImmediate
    ? {
        name: driverTemplate.name,
        phone: driverTemplate.phone,
        carModel: driverTemplate.carModel,
        licensePlate: driverTemplate.platePrefix,
        currentEtaMinutes: estimate.etaMinutes,
      }
    : undefined;

  const status: TaxiStatus = isImmediate ? 'DISPATCHED' : 'REQUESTED';

  const newRide: TaxiRide = {
    id: rideId,
    productionId: params.productionId,
    productionTitle: params.productionTitle,
    passengerName: params.passengerName.trim(),
    passengerPhone: params.passengerPhone.trim(),
    passengerRole: params.passengerRole || 'GUEST',
    pickupAddress: params.pickupAddress.trim(),
    dropoffAddress: params.dropoffAddress.trim(),
    direction: params.direction || 'TO_STUDIO',
    scheduledTime,
    isImmediate,
    vehicleType,
    status,
    estimatedPriceShekels: estimate.estimatedPriceShekels,
    driver,
    gettOrderId,
    trackingUrl: `https://gett.app/track/${gettOrderId}`,
    costCenter: params.costCenter || (params.productionTitle ? `${params.productionTitle} (Production)` : 'JNS Video Operations'),
    notes: params.notes?.trim(),
    orderedByUserId: user.id,
    orderedByUserName: user.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!Array.isArray(db.taxiRides)) {
    db.taxiRides = [];
  }
  db.taxiRides.unshift(newRide);
  await saveDbAsync(db);

  await logAudit(
    params.productionId,
    user,
    'ORDER_TAXI',
    `${user.name} ordered Gett taxi for ${newRide.passengerName} (${newRide.direction === 'TO_STUDIO' ? 'to Studio' : 'from Studio'}). Order ID: ${gettOrderId}, Estimated: ₪${newRide.estimatedPriceShekels}.`
  );

  return newRide;
}

/**
 * Cancels an active or scheduled Gett taxi order.
 */
export async function cancelTaxiOrder(rideId: string, user: User, reason?: string): Promise<TaxiRide> {
  const db = await getDbAsync();
  const ride = db.taxiRides?.find((r) => r.id === rideId);
  if (!ride) {
    throw new Error('Taxi ride not found.');
  }

  if (ride.status === 'COMPLETED') {
    throw new Error('Cannot cancel a ride that has already completed.');
  }
  if (ride.status === 'CANCELLED') {
    return ride;
  }

  ride.status = 'CANCELLED';
  ride.updatedAt = new Date().toISOString();
  if (reason) {
    ride.notes = ride.notes ? `${ride.notes} (Cancelled: ${reason})` : `Cancelled: ${reason}`;
  }

  await saveDbAsync(db);

  await logAudit(
    ride.productionId,
    user,
    'CANCEL_TAXI',
    `${user.name} cancelled Gett taxi for ${ride.passengerName} (Order: ${ride.gettOrderId}).`
  );

  return ride;
}

/**
 * Updates ride status (e.g. simulated or webhook dispatch).
 */
export async function updateTaxiStatus(
  rideId: string,
  newStatus: TaxiStatus,
  actualPrice?: number
): Promise<TaxiRide> {
  const db = await getDbAsync();
  const ride = db.taxiRides?.find((r) => r.id === rideId);
  if (!ride) {
    throw new Error('Taxi ride not found.');
  }

  ride.status = newStatus;
  ride.updatedAt = new Date().toISOString();

  if (newStatus === 'DISPATCHED' && !ride.driver) {
    const template =
      ride.vehicleType === 'XL'
        ? DRIVER_POOL[5]
        : DRIVER_POOL[Math.floor(Math.random() * (DRIVER_POOL.length - 1))];
    ride.driver = {
      name: template.name,
      phone: template.phone,
      carModel: template.carModel,
      licensePlate: template.platePrefix,
      currentEtaMinutes: 5,
    };
  }

  if (newStatus === 'ARRIVED' && ride.driver) {
    ride.driver.currentEtaMinutes = 0;
  }

  if (newStatus === 'COMPLETED') {
    ride.actualPriceShekels = actualPrice || ride.estimatedPriceShekels;
    if (ride.driver) {
      ride.driver.currentEtaMinutes = 0;
    }
  }

  await saveDbAsync(db);
  return ride;
}
