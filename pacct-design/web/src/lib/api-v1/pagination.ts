export interface CursorPayload {
  id: string;
  created_at: string;
}

export interface PaginationParams {
  limit: number;
  cursor: CursorPayload | null;
  sort: string;
  order: "asc" | "desc";
}

export function encodeCursor(obj: { id: string; created_at: string }): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.id === "string" && typeof parsed.created_at === "string") {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit), 100);

  const cursorStr = searchParams.get("cursor");
  const cursor = cursorStr ? decodeCursor(cursorStr) : null;

  const sort = searchParams.get("sort") || "created_at";

  const rawOrder = searchParams.get("order");
  const order: "asc" | "desc" = rawOrder === "asc" ? "asc" : "desc";

  return { limit, cursor, sort, order };
}
