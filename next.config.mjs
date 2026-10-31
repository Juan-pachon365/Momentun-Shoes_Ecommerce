/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  sassOptions: { silenceDeprecations: ["legacy-js-api"] },
};

export default nextConfig;
