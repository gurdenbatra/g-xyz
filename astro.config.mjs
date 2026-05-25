import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: 'https://gurden.xyz',
  redirects: {
    '/work': '/polyculture',
    '/work/[slug]': '/polyculture/[slug]',
    '/about': '/compost',
  },
});
