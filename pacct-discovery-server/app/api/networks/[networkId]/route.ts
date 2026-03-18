import { NextRequest, NextResponse } from 'next/server';
import { getNetworkRepo, getMemberRepo, getManifestRepo, getPresenceRepo } from '@/lib/db/instance';

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
    const manifests = getManifestRepo().getSpecManifests(networkId);
    const networkManifest = getManifestRepo().getNetworkManifest(networkId);
    const presence = getPresenceRepo().getNetworkPresence(networkId);

    return NextResponse.json({
      network,
      members,
      manifests,
      networkManifest,
      presence,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get network' }, { status: 500 });
  }
}
