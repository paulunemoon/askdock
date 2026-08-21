/** @type {import('next').NextConfig} */
export default {
  // The workspace packages ship untranspiled ESM.
  transpilePackages: ["@askdock/core", "@askdock/react", "@askdock/server"],
};
