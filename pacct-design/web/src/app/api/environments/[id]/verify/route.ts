import { NextResponse } from "next/server";
import dns from "node:dns/promises";

export const dynamic = "force-dynamic";

/**
 * POST /api/environments/:id/verify — DNS TXT record verification.
 *
 * Looks up `_loadtoad-verify.<domain>` for a TXT record matching
 * the environment's `verification_token`. If found, marks the
 * environment as verified.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { getEnvironment, updateEnvironmentVerification } = await import("@loadtoad/db");
    const env = await getEnvironment(params.id);
    if (!env) {
      return NextResponse.json({ error: "Environment not found" }, { status: 404 });
    }

    if (!env.verification_token) {
      return NextResponse.json({ error: "No verification token set" }, { status: 400 });
    }

    if (env.verified) {
      return NextResponse.json({ verified: true, message: "Already verified" });
    }

    // Extract domain from base_url
    let domain: string;
    try {
      const url = new URL(env.base_url);
      domain = url.hostname;
    } catch {
      return NextResponse.json({ error: "Invalid base_url — cannot extract domain" }, { status: 400 });
    }

    const recordName = `_loadtoad-verify.${domain}`;

    // Look up TXT records
    let records: string[][];
    try {
      records = await dns.resolveTxt(recordName);
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENODATA" || code === "ENOTFOUND") {
        return NextResponse.json({
          verified: false,
          error: `No TXT record found at ${recordName}. Add a TXT record with value "${env.verification_token}".`,
          record_name: recordName,
          expected_value: env.verification_token,
        });
      }
      throw err;
    }

    // TXT records come back as arrays of strings (chunks); join each record
    const flat = records.map(chunks => chunks.join(""));
    const match = flat.some(txt => txt.trim() === env.verification_token);

    if (!match) {
      return NextResponse.json({
        verified: false,
        error: `TXT record found at ${recordName}, but none match the expected token. Found: ${flat.join(", ")}`,
        record_name: recordName,
        expected_value: env.verification_token,
        found_values: flat,
      });
    }

    // Mark as verified
    const updated = await updateEnvironmentVerification(
      params.id,
      true,
      new Date().toISOString(),
    );

    return NextResponse.json({
      verified: true,
      message: "DNS verification successful!",
      environment: updated,
    });
  } catch (err) {
    console.error(`DNS verification failed for ${params.id}:`, err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
