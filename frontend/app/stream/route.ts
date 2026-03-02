import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const backendRes = await fetch(`${BACKEND_URL}/api/query/stream`, {
    method: "POST",
    // Connection: close prevents this SSE socket from being returned to the
    // shared undici pool, which would cause ECONNRESET on subsequent /api/* rewrites
    headers: { "Content-Type": "application/json", Connection: "close" },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok || !backendRes.body) {
    return new Response(JSON.stringify({ error: "Backend error" }), {
      status: backendRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe the SSE stream directly — no buffering
  return new Response(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
