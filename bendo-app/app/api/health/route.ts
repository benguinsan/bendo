import { NextResponse } from "next/server";

/** Liveness probe for desktop spawn / load balancers. No auth, no DB. */
export function GET() {
  return NextResponse.json(
    { ok: true, service: "bendo" },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
