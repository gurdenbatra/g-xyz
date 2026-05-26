import { describe, it, expect } from 'vitest';
import { projectSchema, poemSchema, artSchema, nowSchema } from './schemas';

describe('projectSchema', () => {
  it('accepts valid project frontmatter', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling for circular economy transitions',
      role: 'Lead Developer & Designer',
      year: 2021,
      tags: ['civic-tech', 'legal'],
      featured: true,
    });
    expect(result.success).toBe(true);
  });

  it('defaults featured to false when omitted', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.featured).toBe(false);
  });

  it('rejects when required fields are missing', () => {
    const result = projectSchema.safeParse({ title: 'CircuLaw' });
    expect(result.success).toBe(false);
  });

  it('rejects when year is a string instead of number', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'test',
      role: 'dev',
      year: '2021',
      tags: ['civic-tech'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional collaborators array', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
      collaborators: ['Romy Snijders', 'Heather Griffin'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional links with valid URLs', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
      links: [{ label: 'App', url: 'https://circulaw.nl' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects links with invalid URLs', () => {
    const result = projectSchema.safeParse({
      title: 'CircuLaw',
      description: 'Legal tooling',
      role: 'Lead Developer',
      year: 2021,
      tags: ['civic-tech'],
      links: [{ label: 'App', url: 'not-a-url' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a project with plantType set', () => {
    const result = projectSchema.parse({
      title: 'Test',
      description: 'A test project',
      role: 'Dev',
      year: 2024,
      tags: ['tag'],
      plantType: 'fern',
    });
    expect(result.plantType).toBe('fern');
  });

  it('accepts a project with plantType omitted (it is optional)', () => {
    const result = projectSchema.parse({
      title: 'Test',
      description: 'A test project',
      role: 'Dev',
      year: 2024,
      tags: ['tag'],
    });
    expect(result.plantType).toBeUndefined();
  });

  it('rejects a project with an invalid plantType', () => {
    expect(() =>
      projectSchema.parse({
        title: 'Test',
        description: 'A test project',
        role: 'Dev',
        year: 2024,
        tags: ['tag'],
        plantType: 'tree',
      }),
    ).toThrow();
  });
});

describe('poemSchema', () => {
  it('accepts valid poem frontmatter', () => {
    const result = poemSchema.safeParse({
      title: 'Untitled',
      date: new Date('2024-01-01'),
    });
    expect(result.success).toBe(true);
  });

  it('defaults customLayout to false', () => {
    const result = poemSchema.safeParse({
      title: 'Untitled',
      date: new Date('2024-01-01'),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customLayout).toBe(false);
  });

  it('rejects missing title', () => {
    const result = poemSchema.safeParse({ date: new Date() });
    expect(result.success).toBe(false);
  });
});

describe('artSchema', () => {
  it('accepts valid art frontmatter', () => {
    const result = artSchema.safeParse({
      title: 'Reaction Diffusion I',
      date: new Date('2024-06-01'),
      medium: 'canvas',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid medium value', () => {
    const result = artSchema.safeParse({
      title: 'Test',
      date: new Date(),
      medium: 'photoshop',
    });
    expect(result.success).toBe(false);
  });

  it('defaults liveEmbed to false', () => {
    const result = artSchema.safeParse({
      title: 'Test',
      date: new Date(),
      medium: 'webgl',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.liveEmbed).toBe(false);
  });

  it('rejects liveEmbed: true without sourceUrl', () => {
    const result = artSchema.safeParse({
      title: 'Test',
      date: new Date(),
      medium: 'webgl',
      liveEmbed: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts liveEmbed: true with sourceUrl', () => {
    const result = artSchema.safeParse({
      title: 'Test',
      date: new Date(),
      medium: 'webgl',
      liveEmbed: true,
      sourceUrl: 'https://example.com/sketch',
    });
    expect(result.success).toBe(true);
  });
});

describe('nowSchema', () => {
  const valid = {
    carrying: [{ label: 'Work', detail: 'Civic tech in Berlin' }],
    reading:  [{ label: 'A Book', detail: 'Author — subtitle' }],
    contact:  [{ label: 'Email', url: 'mailto:test@example.com', detail: 'test@example.com' }],
  };

  it('accepts valid now frontmatter', () => {
    expect(nowSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts contact without optional detail', () => {
    const data = {
      ...valid,
      contact: [{ label: 'GitHub', url: 'https://github.com/user' }],
    };
    expect(nowSchema.safeParse(data).success).toBe(true);
  });

  it('rejects missing carrying field', () => {
    const { carrying: _c, ...rest } = valid;
    expect(nowSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects empty url string', () => {
    const data = { ...valid, contact: [{ label: 'Email', url: '' }] };
    expect(nowSchema.safeParse(data).success).toBe(false);
  });

  it('accepts mailto: url (not filtered out by .url())', () => {
    const data = {
      ...valid,
      contact: [{ label: 'Email', url: 'mailto:a@b.com', detail: 'a@b.com' }],
    };
    expect(nowSchema.safeParse(data).success).toBe(true);
  });
});
