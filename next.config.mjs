/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Block framing (clickjacking protection)
          { key: "X-Frame-Options", value: "DENY" },
          // Control referrer info sent on navigation
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict access to browser features not used by the app
          {
            key: "Permissions-Policy",
            value: "camera=self, microphone=self, geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
