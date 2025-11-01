// D:\empresas\catalogo\next.config.mjs
/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  output: "standalone",
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  images: { unoptimized: true },
  compiler: {
    styledComponents: true, // habilita transform de styled-components (SSR + classNames legibles)
  },
};

export default nextConfig;
