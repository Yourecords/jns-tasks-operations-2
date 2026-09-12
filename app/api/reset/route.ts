import { NextRequest, NextResponse } from 'next/server';
import { resetToSeedData, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }

  const fresh = resetToSeedData();
  await saveDbAsync(fresh);
  return NextResponse.json({
    success: true,
    message: 'Database reset to demo seed data.',
    productionsCount: fresh.productions.length,
  });
}
