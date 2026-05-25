import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: [
      // Zone components use the DOM (Canvas, events, etc.)
      ['src/components/zones/**/*.test.ts', 'jsdom'],
    ],
  },
});
