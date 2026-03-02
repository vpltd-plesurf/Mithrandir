import { NextRequest } from "next/server";
import * as http from "node:http";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const { hostname: BACKEND_HOST, port } = new URL(BACKEND_URL);
const BACKEND_PORT = parseInt(port) || 8000;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const bodyStr = JSON.stringify(body);

  return new Promise<Response>((resolve) => {
    // agent: false creates a fresh TCP connection per request, completely
    // bypassing the shared undici pool used by Next.js rewrites. Without
    // this, long-lived SSE sockets corrupt the pool and cause ECONNRESET
    // on subsequent /api/* rewrite requests (e.g. /api/library/stats).
    const backendReq = http.request(
      {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: "/api/query/stream",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
        agent: false,
      },
      (backendRes) => {
        if (!backendRes.statusCode || backendRes.statusCode >= 400) {
          resolve(
            new Response(JSON.stringify({ error: "Backend error" }), {
              status: backendRes.statusCode ?? 500,
              headers: { "Content-Type": "application/json" },
            })
          );
          return;
        }

        const stream = new ReadableStream({
          start(controller) {
            backendRes.on("data", (chunk: Buffer) => controller.enqueue(chunk));
            backendRes.on("end", () => controller.close());
            backendRes.on("error", () => controller.close());
          },
          cancel() {
            backendReq.destroy();
          },
        });

        resolve(
          new Response(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          })
        );
      }
    );

    backendReq.on("error", () => {
      resolve(
        new Response(JSON.stringify({ error: "Backend connection failed" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    backendReq.write(bodyStr);
    backendReq.end();
  });
}
