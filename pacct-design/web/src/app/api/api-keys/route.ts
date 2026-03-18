import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const ORG_ID = "default";

/** GET /api/api-keys — list API keys for current org (never returns key_hash) */
export async function GET(_request: NextRequest) {
  try {
    const { listApiKeysByOrg } = await import("@loadtoad/db");
    const keys = await listApiKeysByOrg(ORG_ID);
    return NextResponse.json({ keys });
  } catch (err) {
    console.error("Failed to list API keys:", err);
    return NextResponse.json({ error: "Failed to list API keys" }, { status: 500 });
  }
}

/** POST /api/api-keys — create a new API key (returns plaintext once) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Generate key: rm_live_ + 32 hex chars
    const secret = randomBytes(16).toString("hex");
    const plaintext = `rm_live_${secret}`;
    const keyPrefix = plaintext.slice(0, 12); // "rm_live_xxxx"
    const keyHash = createHash("sha256").update(plaintext).digest("hex");

    const { createApiKey } = await import("@loadtoad/db");
    const row = await createApiKey(
      ORG_ID,
      body.name.trim(),
      keyHash,
      keyPrefix,
      body.scopes ?? ["*"],
    );

    return NextResponse.json(
      {
        id: row.id,
        name: row.name,
        key: plaintext,
        key_prefix: row.key_prefix,
        scopes: row.scopes,
        created_at: row.created_at,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to create API key:", err);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
