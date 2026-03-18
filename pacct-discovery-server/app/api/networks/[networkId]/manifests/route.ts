import { NextRequest, NextResponse } from 'next/server';
import { getManifestRepo, getNetworkRepo } from '@/lib/db/instance';

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

    const specManifests = getManifestRepo().getSpecManifests(networkId);
    const networkManifest = getManifestRepo().getNetworkManifest(networkId);

    return NextResponse.json({ specManifests, networkManifest });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get manifests' }, { status: 500 });
  }
}
