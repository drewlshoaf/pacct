import { NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db/pool';
import { getInstanceId } from '@/lib/instance-id';

const startedAt = Date.now();

export async function GET() {
  const dbHealth = await checkDbHealth();

  return NextResponse.json({
    status: dbHealth.connected ? 'ok' : 'degraded',
    instanceId: getInstanceId(),
    uptime: Date.now() - startedAt,
    dbHealth,
    version: process.env.npm_package_version ?? '1.0.0',
  });
}
