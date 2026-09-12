import { NextResponse } from 'next/server';
import { resetToSeedData } from '@/lib/db';

export async function POST() {
  const fresh = resetToSeedData();
  return NextResponse.json({ success: true, message: 'Database reset to demo seed data.', productionsCount: fresh.productions.length });
}
