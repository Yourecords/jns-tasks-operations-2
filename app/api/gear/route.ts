import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { GearCheckoutRecord, GearItem, User } from '@/lib/types';
import { logAudit, createNotification } from '@/lib/workflow';

function isStudioOrAdmin(user: User): boolean {
  return (
    user.role === 'ADMIN' ||
    user.jobFunction === 'STUDIO_OPERATOR' ||
    user.id === 'usr_yuri_admin' ||
    user.id === 'usr_ahron_studio'
  );
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isStudioOrAdmin(user)) {
    return NextResponse.json(
      { error: 'Access denied: Equipment Checkout & Studio Gear Log is restricted to Yuri and Ahron.' },
      { status: 403 }
    );
  }

  const db = await getDbAsync();
  return NextResponse.json({
    gearInventory: db.gearInventory || [],
    gearCheckouts: db.gearCheckouts || [],
    teamMembers: db.users
      .filter((u) => u.isActive)
      .map((u) => ({ id: u.id, name: u.name, fullName: u.fullName, email: u.email, positionDisplay: u.positionDisplay })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isStudioOrAdmin(user)) {
    return NextResponse.json(
      { error: 'Access denied: Equipment Checkout & Studio Gear Log is restricted to Yuri and Ahron.' },
      { status: 403 }
    );
  }

  const db = await getDbAsync();
  const body = await req.json();
  const { action } = body;

  // 1. CHECKOUT GEAR TO A CREW MEMBER
  if (action === 'CHECKOUT') {
    const { gearItemId, checkedOutToUserId, projectOrShowName, expectedReturnDate, checkoutNotes } = body;

    if (!gearItemId || !checkedOutToUserId || !expectedReturnDate) {
      return NextResponse.json(
        { error: 'Missing required fields: gear item, recipient crew member, and expected return date are required.' },
        { status: 400 }
      );
    }

    const gearItem = (db.gearInventory || []).find((g) => g.id === gearItemId);
    if (!gearItem) {
      return NextResponse.json({ error: 'Gear item not found.' }, { status: 404 });
    }

    if (gearItem.status === 'CHECKED_OUT') {
      return NextResponse.json({ error: `${gearItem.name} is already checked out.` }, { status: 400 });
    }

    const recipient = db.users.find((u) => u.id === checkedOutToUserId);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient team member not found.' }, { status: 404 });
    }

    const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRecord: GearCheckoutRecord = {
      id: checkoutId,
      gearItemId: gearItem.id,
      gearName: gearItem.name,
      checkedOutToUserId: recipient.id,
      checkedOutToName: recipient.fullName || recipient.name,
      checkedOutToEmail: recipient.email,
      checkedOutByUserId: user.id,
      checkedOutByName: user.name,
      projectOrShowName: projectOrShowName?.trim() || 'JNS Production',
      checkoutDate: new Date().toISOString(),
      expectedReturnDate: expectedReturnDate,
      checkoutNotes: checkoutNotes?.trim(),
      isReturned: false,
    };

    if (!db.gearCheckouts) db.gearCheckouts = [];
    db.gearCheckouts.unshift(newRecord);

    // Update gear item status
    gearItem.status = 'CHECKED_OUT';
    gearItem.currentCheckoutId = checkoutId;
    gearItem.updatedAt = new Date().toISOString();

    await saveDbAsync(db);

    await logAudit(
      undefined,
      user,
      'GEAR_CHECKOUT',
      `Checked out "${gearItem.name}" to ${recipient.name} for project "${newRecord.projectOrShowName}" (Return by: ${expectedReturnDate})`
    );

    await createNotification(
      recipient.id,
      'Studio Gear Checked Out',
      `You checked out ${gearItem.name} from the studio (due back: ${expectedReturnDate}).`,
      '/gear-log',
      'INFO',
      [
        { label: 'Item', value: gearItem.name },
        { label: 'Serial / Barcode', value: `${gearItem.serialNumber} (${gearItem.barcode || 'N/A'})` },
        { label: 'Expected Return', value: expectedReturnDate },
        { label: 'Authorized By', value: user.name },
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Checked out "${gearItem.name}" to ${recipient.name}.`,
      record: newRecord,
      item: gearItem,
    });
  }

  // 2. CHECKIN / RETURN GEAR
  if (action === 'CHECKIN') {
    const { checkoutId, returnCondition, returnNotes } = body;
    if (!checkoutId) {
      return NextResponse.json({ error: 'checkoutId is required.' }, { status: 400 });
    }

    const record = (db.gearCheckouts || []).find((c) => c.id === checkoutId);
    if (!record) {
      return NextResponse.json({ error: 'Checkout record not found.' }, { status: 404 });
    }

    if (record.isReturned) {
      return NextResponse.json({ error: 'This item has already been marked as returned.' }, { status: 400 });
    }

    record.isReturned = true;
    record.actualReturnDate = new Date().toISOString();
    record.returnCondition = returnCondition || 'GOOD';
    record.returnNotes = returnNotes?.trim();

    const gearItem = (db.gearInventory || []).find((g) => g.id === record.gearItemId);
    if (gearItem) {
      gearItem.status = returnCondition === 'NEEDS_REPAIR' || returnCondition === 'DAMAGED' ? 'MAINTENANCE' : 'AVAILABLE';
      if (returnCondition) gearItem.condition = returnCondition;
      gearItem.currentCheckoutId = undefined;
      gearItem.updatedAt = new Date().toISOString();
    }

    await saveDbAsync(db);

    await logAudit(
      undefined,
      user,
      'GEAR_CHECKIN',
      `Checked in "${record.gearName}" from ${record.checkedOutToName}. Condition: ${record.returnCondition || 'Normal'}.`
    );

    return NextResponse.json({
      success: true,
      message: `Checked in "${record.gearName}" successfully.`,
      record,
      item: gearItem,
    });
  }

  // 3. ADD NEW GEAR ITEM TO INVENTORY
  if (action === 'ADD_ITEM') {
    const { name, category, model, serialNumber, barcode, location, condition, notes } = body;
    if (!name || !category || !model || !serialNumber) {
      return NextResponse.json(
        { error: 'Name, category, model, and serial number are required.' },
        { status: 400 }
      );
    }

    const newItem: GearItem = {
      id: `gear_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      category,
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      barcode: barcode?.trim(),
      location: location?.trim() || 'Studio Equipment Room',
      status: 'AVAILABLE',
      condition: condition || 'GOOD',
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.gearInventory) db.gearInventory = [];
    db.gearInventory.push(newItem);
    await saveDbAsync(db);

    await logAudit(undefined, user, 'ADD_GEAR_ITEM', `Added new equipment item: "${newItem.name}" (${newItem.category})`);

    return NextResponse.json({
      success: true,
      message: `Added "${newItem.name}" to studio inventory.`,
      item: newItem,
    });
  }

  // 4. REMOVE GEAR ITEM FROM INVENTORY
  if (action === 'DELETE_ITEM') {
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    const item = (db.gearInventory || []).find((g) => g.id === id);
    if (!item) {
      return NextResponse.json({ error: 'Gear item not found.' }, { status: 404 });
    }

    if (item.status === 'CHECKED_OUT') {
      return NextResponse.json(
        { error: `Cannot remove "${item.name}" while it is currently checked out on active loan. Please check in the item first.` },
        { status: 400 }
      );
    }

    db.gearInventory = (db.gearInventory || []).filter((g) => g.id !== id);
    await saveDbAsync(db);

    await logAudit(
      undefined,
      user,
      'DELETE_GEAR_ITEM',
      `${user.name} removed equipment item "${item.name}" (${item.category}, SN: ${item.serialNumber}) from studio inventory.`
    );

    return NextResponse.json({
      success: true,
      message: `Removed "${item.name}" from equipment inventory.`,
      deletedId: id,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user || !isStudioOrAdmin(user)) {
    return NextResponse.json(
      { error: 'Access denied: Equipment Checkout & Studio Gear Log is restricted to Yuri and Ahron.' },
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
    return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
  }

  const db = await getDbAsync();
  const item = (db.gearInventory || []).find((g) => g.id === id);
  if (!item) {
    return NextResponse.json({ error: 'Gear item not found.' }, { status: 404 });
  }

  if (item.status === 'CHECKED_OUT') {
    return NextResponse.json(
      { error: `Cannot remove "${item.name}" while it is currently checked out on active loan. Please check in the item first.` },
      { status: 400 }
    );
  }

  db.gearInventory = (db.gearInventory || []).filter((g) => g.id !== id);
  await saveDbAsync(db);

  await logAudit(
    undefined,
    user,
    'DELETE_GEAR_ITEM',
    `${user.name} removed equipment item "${item.name}" (${item.category}, SN: ${item.serialNumber}) from studio inventory.`
  );

  return NextResponse.json({
    success: true,
    message: `Removed "${item.name}" from equipment inventory.`,
    deletedId: id,
  });
}

