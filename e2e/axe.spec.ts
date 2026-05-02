import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'home',           path: '/' },
  { name: 'work index',     path: '/work' },
  { name: 'work circulaw',  path: '/work/circulaw' },
  { name: 'about',          path: '/about' },
  { name: 'colophon',       path: '/colophon' },
  { name: 'styleguide',     path: '/styleguide' },
];

for (const { name, path } of pages) {
  test(`${name} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
