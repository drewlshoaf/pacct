import { NextRequest, NextResponse } from 'next/server';
import { getApplicantRepo, getNetworkRepo, getEventRepo } from '@/lib/db/instance';
import { updateApplicantStatusSchema } from '@/lib/validation/api-validators';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ networkId: string; nodeId: string }> },
) {
  try {
    const { networkId, nodeId } = await params;
    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const applicant = getApplicantRepo().getApplicant(networkId, nodeId);
    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    return NextResponse.json({ applicant });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get applicant' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string; nodeId: string }> },
) {
  try {
    const { networkId, nodeId } = await params;
    const body = await request.json();
    const parsed = updateApplicantStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const existing = getApplicantRepo().getApplicant(networkId, nodeId);
    if (!existing) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

    const applicant = getApplicantRepo().updateApplicantStatus(networkId, nodeId, parsed.data.status);

    getEventRepo().logEvent({
      networkId,
      eventType: `applicant_status_changed`,
      nodeId,
      payload: { from: existing.status, to: parsed.data.status },
    });

    return NextResponse.json({ applicant });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update applicant' }, { status: 500 });
  }
}
