import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages 项目站：产物挂在 little-pig-create.github.io/idmt/ 下。
  // 注意 Astro 的 base 只重写它自己生成的链接（资源、canonical、sitemap），
  // 源码里手写的根绝对路径必须过 src/lib/paths.ts 的 u() 加前缀。
  // 默认值对应 GitHub Pages 项目站；自托管时用环境变量覆盖：
  //   SITE_URL=http://115.159.38.245:8080 BASE_PATH=/ npm run build
  site: process.env.SITE_URL ?? 'https://little-pig-create.github.io',
  base: process.env.BASE_PATH ?? '/idmt',
  integrations: [mdx(), sitemap(), react()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
