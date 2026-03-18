import { NextRequest, NextResponse } from 'next/server';
import { getPresenceRepo, getNetworkRepo } from '@/lib/db/instance';
import { updatePresenceSchema } from '@/lib/validation/api-validators';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  try {
    const { networkId } = await params;
    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const presence = getPresenceRepo().getNetworkPresence(networkId);
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
    const parsed = updatePresenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const presence = getPresenceRepo().updatePresence({
      networkId,
      nodeId: parsed.data.nodeId,
      online: parsed.data.online,
    });

    return NextResponse.json({ presence });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
  }
}
