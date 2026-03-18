import { NextRequest, NextResponse } from 'next/server';
import { getEventRepo, getNetworkRepo } from '@/lib/db/instance';
import { paginationSchema } from '@/lib/validation/api-validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> },
) {
  try {
    const { networkId } = await params;
    const network = getNetworkRepo().getNetwork(networkId);
    if (!network) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const pagination = paginationSchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    const events = getEventRepo().getEvents(networkId, pagination.limit ?? 50, pagination.offset ?? 0);
    const total = getEventRepo().countEvents(networkId);

    return NextResponse.json({
      events,
      pagination: {
        total,
        limit: pagination.limit ?? 50,
        offset: pagination.offset ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get events' }, { status: 500 });
  }
}
