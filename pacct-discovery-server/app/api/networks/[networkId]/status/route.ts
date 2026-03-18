import { NextRequest, NextResponse } from 'next/server';
import { getNetworkRepo, getEventRepo } from '@/lib/db/instance';
import { updateNetworkStatusSchema } from '@/lib/validation/api-validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  try {
    const { networkId } = await params;
    const body = await request.json();
    const parsed = updateNetworkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const networkRepo = getNetworkRepo();
    const existing = networkRepo.getNetwork(networkId);
    if (!existing) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const network = networkRepo.updateNetworkStatus(networkId, parsed.data.status);

    getEventRepo().logEvent({
      networkId,
      eventType: 'network_status_changed',
      payload: { from: existing.status, to: parsed.data.status },
    });

    return NextResponse.json({ network });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update network status' }, { status: 500 });
  }
}
