import { NextRequest, NextResponse } from "next/server";

const AI_ENDPOINTS = new Set([
  "/api/frame/questions",
  "/api/frame/brief",
  "/api/mirror/overlay",
]);

/** Simple path-based check: does the URL look like an AI generation endpoint? */
function isAIEndpoint(pathname: string): boolean {
  return (
    AI_ENDPOINTS.has(pathname) ||
    /\/api\/frame\/[^/]+\/questions$/.test(pathname) ||
    /\/api\/frame\/[^/]+\/brief$/.test(pathname) ||
    /\/api\/mirror\/[^/]+\/overlay$/.test(pathname)
  );
}

function isAudienceResponseEndpoint(pathname: string): boolean {
  return /\/api\/mirror\/[^/]+\/respond$/.test(pathname);
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Only apply rate limiting if Upstash Redis is configured
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return NextResponse.next();
  }

  const { Ratelimit } = await import("@upstash/ratelimit");
  // Use the edge-compatible HTTP client (not the Node.js binary one)
  const { Redis } = await import("@upstash/redis/cloudflare");

  const redis = new Redis({ url: upstashUrl, token: upstashToken });

  let limit: number;
  let window: Parameters<typeof Ratelimit.slidingWindow>[1];
  let identifier: string;

  if (isAIEndpoint(pathname)) {
    // Per-token rate limit for AI endpoints: 10 req/hour
    limit = 10;
    window = "1 h";
    // Token is the 3rd path segment for frame routes, 3rd for mirror routes
    const segments = pathname.split("/").filter(Boolean);
    identifier = `ai:${segments[2] ?? "unknown"}`;
  } else if (isAudienceResponseEndpoint(pathname)) {
    // Per-mtoken: 20 responses/hour
    limit = 20;
    window = "1 h";
    const segments = pathname.split("/").filter(Boolean);
    identifier = `respond:${segments[2] ?? "unknown"}`;
  } else {
    // Default: 60 req/minute per IP
    limit = 60;
    window = "1 m";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    identifier = `ip:${ip}`;
  }

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
  });

  const { success, limit: rateLimit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
