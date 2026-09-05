import { describe, it, expect } from 'vitest';
import { projectSchema, nowSchema, mulchSchema } from './schemas';

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

describe('nowSchema', () => {
  const valid = {
    carrying: [{ label: 'Work', detail: 'Civic tech in Berlin' }],
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

  it('rejects empty label string in carrying', () => {
    const data = { ...valid, carrying: [{ label: '', detail: 'some detail' }] };
    expect(nowSchema.safeParse(data).success).toBe(false);
  });

  it('rejects empty carrying array', () => {
    const data = { ...valid, carrying: [] };
    expect(nowSchema.safeParse(data).success).toBe(false);
  });

  it('rejects empty contact array', () => {
    const data = { ...valid, contact: [] };
    expect(nowSchema.safeParse(data).success).toBe(false);
  });

  it('parses a now entry without a reading field', () => {
    const result = nowSchema.safeParse({
      carrying: [{ label: 'Civic Tech @ DML', detail: 'Systems change through civic technology' }],
      contact: [{ label: 'Email', url: 'mailto:gurden@darkmatterlabs.org', detail: 'gurden@darkmatterlabs.org' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('mulchSchema', () => {
  it('accepts a valid poem with no embedUrl', () => {
    const result = mulchSchema.safeParse({
      title: 'Elegy for the undercommons',
      kind: 'poem',
      year: 2023,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid essay with optional description', () => {
    const result = mulchSchema.safeParse({
      title: 'What civic technology actually means',
      kind: 'essay',
      year: 2024,
      description: 'On care as infrastructure',
    });
    expect(result.success).toBe(true);
  });

  it('accepts music with an external url', () => {
    const result = mulchSchema.safeParse({
      title: 'thurs',
      kind: 'music',
      url: 'https://soundcloud.com/enu3/thurs',
    });
    expect(result.success).toBe(true);
  });

  it('accepts av with an external url and no year', () => {
    const result = mulchSchema.safeParse({
      title: 'Moving image — I',
      kind: 'av',
      url: 'https://www.instagram.com/p/placeholder/',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a piece with no year (year is optional)', () => {
    const result = mulchSchema.safeParse({
      title: 'A track',
      kind: 'music',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid kind', () => {
    const result = mulchSchema.safeParse({
      title: 'Test',
      kind: 'photo',
      year: 2023,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-URL url', () => {
    const result = mulchSchema.safeParse({
      title: 'A track',
      kind: 'music',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects year below 1900', () => {
    const result = mulchSchema.safeParse({
      title: 'Ancient poem',
      kind: 'poem',
      year: 1800,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = mulchSchema.safeParse({ kind: 'poem', year: 2023 });
    expect(result.success).toBe(false);
  });
});
