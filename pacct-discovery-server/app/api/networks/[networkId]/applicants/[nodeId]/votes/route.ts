import { NextRequest, NextResponse } from 'next/server';
import { getVoteRepo, getNetworkRepo, getApplicantRepo, getEventRepo } from '@/lib/db/instance';
import { castVoteSchema } from '@/lib/validation/api-validators';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ networkId: string; nodeId: string }> },
) {
  try {
    const { networkId, nodeId } = await params;
    const votes = getVoteRepo().getVotes(networkId, nodeId);
    const counts = getVoteRepo().getVoteCount(networkId, nodeId);
    return NextResponse.json({ votes, counts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get votes' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string; nodeId: string }> },
) {
  try {
    const { networkId, nodeId } = await params;
    const body = await request.json();
    const parsed = castVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const applicant = getApplicantRepo().getApplicant(networkId, nodeId);
    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    const vote = getVoteRepo().castVote({
      networkId,
      applicantNodeId: nodeId,
      voterNodeId: parsed.data.voterNodeId,
      vote: parsed.data.vote,
      signature: parsed.data.signature,
    });

    getEventRepo().logEvent({
      networkId,
      eventType: 'vote_cast',
      nodeId: parsed.data.voterNodeId,
      payload: { applicantNodeId: nodeId, vote: parsed.data.vote },
    });

    return NextResponse.json({ vote }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
  }
}
