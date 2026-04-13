/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/database"],
  serverExternalPackages: ["couchbase"],
}


export default nextConfig
