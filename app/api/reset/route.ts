import { NextRequest, NextResponse } from 'next/server';
import { resetToSeedData } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const adminSecret = req.headers.get('x-admin-secret');
    const expectedSecret = process.env.ADMIN_RESET_SECRET;
    const user = await getAuthenticatedUser(req);

    const isAuthorizedAdmin = (user && user.role === 'ADMIN') || (expectedSecret && adminSecret === expectedSecret);

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Database reset is disabled in production environments.' },
        { status: 403 }
      );
    }
  }

  const fresh = resetToSeedData();
  return NextResponse.json({
    success: true,
    message: 'Database reset to demo seed data.',
    productionsCount: fresh.productions.length,
  });
}
