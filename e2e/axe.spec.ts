import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'home',           path: '/' },
  { name: 'flora index',    path: '/flora' },
  { name: 'flora circulaw', path: '/flora/circulaw' },
  { name: 'roots',          path: '/roots' },
  { name: 'castings',       path: '/castings' },
  { name: 'styleguide',     path: '/styleguide' },
];

for (const { name, path } of pages) {
  test(`${name} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
