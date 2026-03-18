import { NextResponse } from "next/server";

export function ok(data: unknown) {
  return NextResponse.json({ data }, { status: 200 });
}

export function created(data: unknown) {
  return NextResponse.json({ data }, { status: 201 });
}

export function accepted(data: unknown) {
  return NextResponse.json({ data }, { status: 202 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function paginated(
  data: unknown[],
  pagination: { cursor: string | null; has_more: boolean; total: number },
) {
  return NextResponse.json({ data, pagination }, { status: 200 });
}
