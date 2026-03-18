import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ORG_ID = "default";

/** DELETE /api/api-keys/:id — revoke an API key */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { revokeApiKey } = await import("@loadtoad/db");
    const revoked = await revokeApiKey(params.id, ORG_ID);
    if (!revoked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(`Failed to revoke API key ${params.id}:`, err);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
