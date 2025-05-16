import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  integrations: [mdx()],
   base: '/blog',  // ✅ needed for correct subfolder deploy under mycardverse.com/blog
});
