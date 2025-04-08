/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Отключаем ESLint для сборки
  eslint: {
    // Предотвращаем остановку сборки из-за ошибок ESLint
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Это заставит webpack игнорировать CSS файлы react-pdf
    config.module.rules.push({
      test: /react-pdf\/dist\/esm\/Page\/(AnnotationLayer|TextLayer)\.css$/,
      use: 'null-loader',
    });

    return config;
  },
};

module.exports = nextConfig; 