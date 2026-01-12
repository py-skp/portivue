/** @type {import('next').NextConfig} */

// Point this to your FastAPI origin (reachable from the Next server).
// Dev:  BACKEND_ORIGIN=http://localhost:8000
// Prod: BACKEND_ORIGIN=http://fastapi:8000   (docker compose / k8s service)
//       or https://api.yourdomain.com        (if you run Next as a Node server and want it to proxy)
const API_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // API under same origin
      { source: "/api/:path*", destination: `${API_ORIGIN}/:path*` },

      // Auth flows proxied too (so redirects stay on your app origin)
      { source: "/auth/:path*", destination: `${API_ORIGIN}/auth/:path*` },
      { source: "/2fa/:path*", destination: `${API_ORIGIN}/2fa/:path*` },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;