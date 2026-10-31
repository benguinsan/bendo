import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

import {
  computeDesktopSessionProof,
  isValidDesktopNonce,
} from "./lib/desktop/session-proof";

/**
 * Without CLERK_SECRET_KEY (packaged desktop → Vercel for auth), Clerk
 * middleware cannot run. Sign-in uses ClerkProvider + publishable key;
 * `/api/me` and privileged routes forward the session JWT to Vercel.
 *
 * With CLERK_SECRET_KEY: protect document/page navigations only.
 * Do not auth.protect() `/api/*` — Clerk returns non-JSON 404 for unauthenticated
 * API fetches before route handlers run, so `requireApiUser` → 401 JSON never runs.
 * API auth stays in each route via requireApiUser / unauthorized().
 */
const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY?.trim());

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Local OAuth handoff → bendo:// (must be reachable from the system browser).
  "/auth/desktop-handoff(.*)",
]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

const clerkProtected = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req) || isApiRoute(req)) {
    return;
  }
  await auth.protect();
});

const baseMiddleware = hasClerkSecret
  ? clerkProtected
  : function passthroughMiddleware() {
      return NextResponse.next();
    };

export default async function middleware(request: NextRequest, event: unknown) {
  const result = await (
    baseMiddleware as (
      req: NextRequest,
      evt: unknown
    ) => Response | undefined | Promise<Response | undefined>
  )(request, event);

  const secret = process.env.BENDO_DESKTOP_SESSION_SECRET?.trim();
  const nonce = request.headers.get("x-bendo-desktop-nonce");
  if (!secret || !isValidDesktopNonce(nonce)) {
    return result;
  }

  const proof = await computeDesktopSessionProof(secret, nonce);
  const response = result ?? NextResponse.next();
  response.headers.set("x-bendo-desktop-proof", proof);
  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and /api/health (desktop liveness).
    "/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/health)|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
