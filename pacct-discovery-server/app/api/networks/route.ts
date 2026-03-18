import { NextRequest, NextResponse } from 'next/server';
import { getNetworkRepo, getManifestRepo, getMemberRepo, getEventRepo } from '@/lib/db/instance';
import { createNetworkSchema } from '@/lib/validation/api-validators';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const networks = await getNetworkRepo().listNetworks(status);
    return NextResponse.json({ networks });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list networks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createNetworkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const networkRepo = getNetworkRepo();
    const manifestRepo = getManifestRepo();
    const memberRepo = getMemberRepo();
    const eventRepo = getEventRepo();

    // Check if network already exists
    const existing = await networkRepo.getNetwork(data.id);
    if (existing) {
      return NextResponse.json({ error: 'Network already exists' }, { status: 409 });
    }

    // Create network
    const network = await networkRepo.createNetwork({
      id: data.id,
      alias: data.alias,
      creatorNodeId: data.creatorNodeId,
      visibilityMode: data.visibilityMode,
      visibilityConfig: data.visibilityConfig,
      minActiveMembers: data.minActiveMembers,
      preActivationTimeoutMs: data.preActivationTimeoutMs,
      postActivationInactivityTimeoutMs: data.postActivationInactivityTimeoutMs,
    });

    // Store manifests if provided
    if (data.manifests?.specManifests) {
      await manifestRepo.storeSpecManifests(
        data.manifests.specManifests.map((m) => ({
          networkId: data.id,
          specType: m.specType,
          specId: m.specId,
          hash: m.hash,
          version: m.version,
        })),
      );
    }

    if (data.manifests?.networkManifest) {
      await manifestRepo.storeNetworkManifest({
        networkId: data.id,
        schemaHash: data.manifests.networkManifest.schemaHash,
        computationHash: data.manifests.networkManifest.computationHash,
        governanceHash: data.manifests.networkManifest.governanceHash,
        economicHash: data.manifests.networkManifest.economicHash,
        creatorNodeId: data.creatorNodeId,
        signature: data.manifests.networkManifest.signature,
      });
    }

    // Creator becomes first member
    await memberRepo.addMember({ networkId: data.id, nodeId: data.creatorNodeId });

    // Log event
    await eventRepo.logEvent({
      networkId: data.id,
      eventType: 'network_created',
      nodeId: data.creatorNodeId,
      payload: { alias: data.alias },
    });

    return NextResponse.json({ network }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create network' }, { status: 500 });
  }
}
