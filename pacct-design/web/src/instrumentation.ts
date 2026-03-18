/**
 * Next.js instrumentation hook — runs once on server startup.
 * Used to ensure database schema exists before serving requests.
 */
export async function register() {
  // Only run on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { runMigrations } = await import("@loadtoad/db");
      await runMigrations();
      console.log("[sv] Database migrations complete");
    } catch (err) {
      console.error("[sv] Database migration failed:", err);
    }
  }
}
