import type { NextConfig } from "next";

/**
 * CSP notes:
 * - script-src allows jsdelivr (pdf.js module) + 'wasm-unsafe-eval' (pdf.js
 *   WASM decoders) + 'unsafe-inline' (Next.js hydration payloads).
 * - worker-src allows blob: (cross-origin workers are blocked, so the pdf.js
 *   worker is wrapped in a blob-URL module worker — see src/lib/pdfjs.ts).
 * - connect-src allows blob: (pdf.js fetches its blob-URL worker shim on the
 *   main thread) + the Supabase API + realtime websockets + the pdf.js CDN.
 * - frame-ancestors 'self' + X-Frame-Options SAMEORIGIN: the reader is a
 *   same-origin canvas, no embedding needed.
 */
// React dev mode uses eval() for debugging (callstack reconstruction).
// Allowed only outside production so the deployed CSP stays strict.
const devScriptSrc =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net 'wasm-unsafe-eval'${devScriptSrc}`,
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net",
  "img-src 'self' https://*.supabase.co data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  // Dev-only: the browser preview proxies via 127.0.0.1 which otherwise gets
  // its HMR/dev-resource requests blocked as cross-origin.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
