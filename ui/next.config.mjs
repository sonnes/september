/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.placeholders.dev",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
