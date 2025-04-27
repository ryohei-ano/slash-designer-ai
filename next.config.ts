import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // TypeScriptのビルドエラーを無視
  },
  // 環境変数を明示的に設定
  env: {
    NEXT_PUBLIC_SLACK_CLIENT_ID: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
  },
  // Edge Runtimeでのポリフィル設定
  experimental: {
    serverComponentsExternalPackages: ['@slack/bolt'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // サーバーサイドでのポリフィル
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        path: false,
        fs: false,
      }
    }
    return config
  },
}

export default nextConfig
