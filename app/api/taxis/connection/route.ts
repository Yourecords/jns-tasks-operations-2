import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  canManageTaxis,
  getGettBusinessConfig,
  updateGettBusinessConfig,
  testGettBusinessConnection,
} from '@/lib/gett';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  const config = await getGettBusinessConfig();

  // Mask sensitive credentials before sending to client
  const maskedClientId = config.clientId
    ? config.clientId.length > 8
      ? `${config.clientId.substring(0, 4)}••••${config.clientId.slice(-4)}`
      : '••••••••'
    : '';

  return NextResponse.json({
    config: {
      connected: config.connected,
      accountId: config.accountId || '',
      companyName: config.companyName || 'Jewish News Syndicate (JNS)',
      clientId: maskedClientId,
      hasClientSecret: Boolean(config.clientSecret),
      environment: config.environment || 'production',
      defaultCostCenter: config.defaultCostCenter || 'JNS Video Operations - Jerusalem Studio',
      billingEmail: config.billingEmail || 'production@jns.org',
      autoDispatchLive: Boolean(config.autoDispatchLive),
      lastTestedAt: config.lastTestedAt,
      connectionStatus: config.connectionStatus || (config.connected ? 'CONNECTED' : 'DISCONNECTED'),
      statusMessage: config.statusMessage || '',
    },
    canManage: canManageTaxis(user),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
  }

  if (!canManageTaxis(user)) {
    return NextResponse.json(
      { error: 'Forbidden: Only Administrators, Producers, and Studio Operators can configure Gett Business connection.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action || 'SAVE';

    if (action === 'TEST') {
      const testResult = await testGettBusinessConnection({
        accountId: body.accountId,
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        environment: body.environment,
        companyName: body.companyName,
      });
      return NextResponse.json(testResult);
    }

    if (action === 'DISCONNECT') {
      const updated = await updateGettBusinessConfig(
        {
          connected: false,
          connectionStatus: 'DISCONNECTED',
          statusMessage: 'Gett Business Israel corporate connection disconnected by user.',
        },
        user
      );
      return NextResponse.json({
        success: true,
        message: 'Gett Business Israel account disconnected.',
        config: updated,
      });
    }

    // Default: SAVE or CONNECT
    if (body.connectNow) {
      const testRes = await testGettBusinessConnection({
        accountId: body.accountId,
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        environment: body.environment,
        companyName: body.companyName,
      });

      if (!testRes.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testRes.message}` },
          { status: 400 }
        );
      }
    }

    const updated = await updateGettBusinessConfig(
      {
        connected: body.connected !== undefined ? body.connected : true,
        accountId: body.accountId !== undefined ? body.accountId.trim() : undefined,
        companyName: body.companyName !== undefined ? body.companyName.trim() : undefined,
        clientId: body.clientId !== undefined && body.clientId !== '' ? body.clientId.trim() : undefined,
        clientSecret: body.clientSecret !== undefined && body.clientSecret !== '' ? body.clientSecret.trim() : undefined,
        environment: body.environment || 'production',
        defaultCostCenter: body.defaultCostCenter !== undefined ? body.defaultCostCenter.trim() : undefined,
        billingEmail: body.billingEmail !== undefined ? body.billingEmail.trim() : undefined,
        autoDispatchLive: body.autoDispatchLive !== undefined ? Boolean(body.autoDispatchLive) : undefined,
      },
      user
    );

    return NextResponse.json({
      success: true,
      message: updated.connected
        ? `Gett Business IL connected successfully for JNS Account (${updated.accountId || 'Corporate'}).`
        : 'Gett Business settings updated.',
      config: updated,
    });
  } catch (err: any) {
    console.error('Error updating Gett Business connection', err);
    return NextResponse.json({ error: err.message || 'Failed to update Gett Business connection.' }, { status: 500 });
  }
}
