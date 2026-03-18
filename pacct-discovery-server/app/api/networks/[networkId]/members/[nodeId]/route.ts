import { NextRequest, NextResponse } from 'next/server';
import { getMemberRepo, getNetworkRepo, getEventRepo } from '@/lib/db/instance';
import { updateMemberStatusSchema } from '@/lib/validation/api-validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string; nodeId: string }> },
) {
  try {
    const { networkId, nodeId } = await params;
    const body = await request.json();
    const parsed = updateMemberStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const network = await getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const existing = await getMemberRepo().getMember(networkId, nodeId);
    if (!existing) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = await getMemberRepo().updateMemberStatus(networkId, nodeId, parsed.data.status);

    await getEventRepo().logEvent({
      networkId,
      eventType: `member_status_changed`,
      nodeId,
      payload: { from: existing.status, to: parsed.data.status },
    });

    return NextResponse.json({ member });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}
