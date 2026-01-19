/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone' est retiré car Vercel gère automatiquement le build
  // Important pour Socket.io (si utilisé)
  webpack: (config, { isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });

    // Configuration pour react-markdown et remark-gfm
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
  // Transpiler les packages nécessaires
  transpilePackages: ['react-markdown', 'remark-gfm'],
};

module.exports = nextConfig;

