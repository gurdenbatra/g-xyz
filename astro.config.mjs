import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: 'https://gurden.garden',
  redirects: {
    '/work': '/flora',
    '/work/[slug]': '/flora/[slug]',
    '/polyculture': '/flora',
    '/polyculture/[slug]': '/flora/[slug]',
    '/canopy': '/mulch',
    '/about': '/roots',
    '/compost': '/roots',
    '/colophon': '/castings',
    '/beds': '/castings',
    '/mycelium': '/hive',
  },
});
