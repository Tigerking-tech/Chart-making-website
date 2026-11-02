/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 引擎为纯 JS 模块，明确允许在 Server/Client 组件间被导入
  webpack: (config, { webpack }) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
    };
    // pptxgenjs 的 ESM 入口引用 node:fs / node:https 等 Node 内置模块，
    // 浏览器端写文件走 Blob 不依赖它们；剥离 node: 前缀并 fallback 为 false。
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, https: false, http: false, os: false,
      path: false, stream: false, zlib: false, crypto: false,
      net: false, tls: false,
    };
    return config;
  },
};

export default nextConfig;
