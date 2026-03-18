import { NextRequest, NextResponse } from 'next/server';
import { getMemberRepo, getNetworkRepo, getEventRepo } from '@/lib/db/instance';
import { addMemberSchema } from '@/lib/validation/api-validators';

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

    const members = getMemberRepo().getMembers(networkId);
    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  try {
    const { networkId } = await params;
    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const existing = getMemberRepo().getMember(networkId, parsed.data.nodeId);
    if (existing) {
      return NextResponse.json({ error: 'Member already exists' }, { status: 409 });
    }

    const member = getMemberRepo().addMember({
      networkId,
      nodeId: parsed.data.nodeId,
      status: parsed.data.status,
    });

    getEventRepo().logEvent({
      networkId,
      eventType: 'member_joined',
      nodeId: parsed.data.nodeId,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
