/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kthtwwuikeevwoydtjuf.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/eventos', destination: '/edicoes', permanent: true },
      { source: '/eventos/:path*', destination: '/edicoes/:path*', permanent: true },
      { source: '/contato', destination: '/parceiros', permanent: true },
      { source: '/expositor', destination: '/expositores', permanent: true },
      { source: '/expositor/:path*', destination: '/expositores/:path*', permanent: true },
    ]
  },
}

module.exports = nextConfig
