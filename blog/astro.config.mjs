import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  base: '/blog',  // 🔥 This makes links relative under /blog
});