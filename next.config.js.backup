// Note: Console suppression removed to prevent Next.js build issues with URL validation
// Sensitive data protection is handled by environment variables and security headers

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Netlify's Next.js integration runs lint during build; treat warnings locally instead of blocking deploys
    ignoreDuringBuilds: true,
  },
  // Sentry configuration moved to instrumentation.ts and sentry.*.config.ts
  
  // Performance optimizations for legal platform
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    // Windows-specific optimizations to prevent Jest worker errors
    workerThreads: false,
    cpus: 1,
    // Disable parallel compilation to prevent worker issues
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
  },

  // Image optimization for judge profiles and court images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'courtlistener.com',
      },
      {
        protocol: 'https',
        hostname: 'www.courtlistener.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 hours cache for profile images
    dangerouslyAllowSVG: false,
  },

  // Enhanced security and performance headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? process.env.NEXT_PUBLIC_SITE_URL || 'https://judgefinder.io'
              : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,HEAD,POST,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization,X-Requested-With',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
          // Prevent MIME type sniffing attacks - forces browsers to respect declared content-type
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking attacks - blocks API endpoints from being embedded in iframes
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Legacy XSS protection for older browsers - blocks page rendering on XSS detection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Cache headers are handled by middleware.ts for proper SEO and performance
      // Static assets get long-term caching
      {
        source: '/(.*)\\.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2)$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      },
      {
        source: '/analytics',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store'
          }
        ],
      }
    ]
  },

  // Optimize bundle for legal research platform
  webpack: (config, { dev, isServer }) => {
    // Set up @ alias for all builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    }
    
    // Windows memory optimization to prevent worker process crashes
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        maxInitialRequests: 20,
        maxAsyncRequests: 20,
      },
    }
    
    return config
  },

  // Enable static optimization for better SEO
  trailingSlash: false,
  generateEtags: true,
  poweredByHeader: false,

  // Optimize for deployment
  // Let Netlify plugin handle output configuration
  // output: undefined, // Automatically handled by @netlify/plugin-nextjs
}

module.exports = nextConfig
