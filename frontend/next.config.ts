import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable HTTP keep-alive for proxy connections — prevents ECONNRESET when
  // backend container restarts and the connection pool has stale sockets.
  httpAgentOptions: {
    keepAlive: false,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
