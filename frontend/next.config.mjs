/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["geist"],
  // Allow images from Pexels CDN and Stability AI
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "videos.pexels.com" },
    ],
  },
};

export default nextConfig;
