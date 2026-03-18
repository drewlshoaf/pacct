import { NextRequest, NextResponse } from 'next/server';
import { getNetworkRepo } from '@/lib/db/instance';
import { getLeaseEngine } from '@/lib/presence/instance';
import { z } from 'zod';

const heartbeatSchema = z.object({
  nodeId: z.string().min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  try {
    const { networkId } = await params;
    const network = await getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const leaseEngine = getLeaseEngine();
    const presence = await leaseEngine.getNetworkPresenceWithAvailability(networkId);
    return NextResponse.json({ presence });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get presence' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  try {
    const { networkId } = await params;
    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const network = await getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const leaseEngine = getLeaseEngine();
    const result = await leaseEngine.processHeartbeat(networkId, parsed.data.nodeId);

    return NextResponse.json({
      leaseExpiresAt: result.leaseExpiresAt,
      instanceId: result.instanceId,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
  }
}
