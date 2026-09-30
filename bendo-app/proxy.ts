import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Without CLERK_SECRET_KEY (packaged desktop → Vercel for auth), Clerk
 * middleware cannot run. Sign-in uses ClerkProvider + publishable key;
 * privileged routes forward the session JWT to Vercel which calls auth().
 */
const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY?.trim());

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const clerkProtected = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default hasClerkSecret
  ? clerkProtected
  : function passthroughMiddleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and /api/health (desktop liveness).
    "/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/health)|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
