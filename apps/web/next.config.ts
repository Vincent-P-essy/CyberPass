import type { NextConfig } from "next";

function resolveApiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").origin;
  } catch {
    return "http://localhost:8000";
  }
}

const apiOrigin = resolveApiOrigin();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${apiOrigin}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/p/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" }
        ]
      }
    ];
  }
};

export default nextConfig;
