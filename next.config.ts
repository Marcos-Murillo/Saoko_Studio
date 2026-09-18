import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Path aliases are handled via tsconfig.json paths — no webpack override needed.
  // Turbopack (default in Next 16 dev) resolves them from tsconfig automatically.
}

export default nextConfig
