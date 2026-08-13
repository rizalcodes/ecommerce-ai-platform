import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_HOST ?? "*.supabase.co";

const nextConfig: NextConfig = {
  images: {
    // Product photos are served from Supabase Storage public URLs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
