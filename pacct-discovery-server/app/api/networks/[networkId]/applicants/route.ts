import { NextRequest, NextResponse } from 'next/server';
import { getApplicantRepo, getNetworkRepo, getEventRepo } from '@/lib/db/instance';
import { submitApplicationSchema } from '@/lib/validation/api-validators';

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

    const applicants = getApplicantRepo().getApplicants(networkId);
    return NextResponse.json({ applicants });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list applicants' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  try {
    const { networkId } = await params;
    const body = await request.json();
    const parsed = submitApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const existing = getApplicantRepo().getApplicant(networkId, parsed.data.nodeId);
    if (existing) {
      return NextResponse.json({ error: 'Application already exists' }, { status: 409 });
    }

    const applicant = getApplicantRepo().createApplicant({
      networkId,
      nodeId: parsed.data.nodeId,
    });

    getEventRepo().logEvent({
      networkId,
      eventType: 'applicant_submitted',
      nodeId: parsed.data.nodeId,
    });

    return NextResponse.json({ applicant }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
