import { describe, it, expect } from 'vitest';
import { projectSchema, nowSchema, canopySchema } from './schemas';

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
});

describe('canopySchema', () => {
  it('accepts a valid poem with no embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'Elegy for the undercommons',
      kind: 'poem',
      year: 2023,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid essay with optional description', () => {
    const result = canopySchema.safeParse({
      title: 'What civic technology actually means',
      kind: 'essay',
      year: 2024,
      description: 'On care as infrastructure',
    });
    expect(result.success).toBe(true);
  });

  it('accepts music with embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'Eternal noises III',
      kind: 'music',
      year: 2024,
      embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts av with embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'Reactive study #4',
      kind: 'av',
      year: 2023,
      embedUrl: 'https://www.instagram.com/p/placeholder/embed/',
    });
    expect(result.success).toBe(true);
  });

  it('rejects music without embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'A track',
      kind: 'music',
      year: 2024,
    });
    expect(result.success).toBe(false);
  });

  it('rejects av without embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'A video',
      kind: 'av',
      year: 2023,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid kind', () => {
    const result = canopySchema.safeParse({
      title: 'Test',
      kind: 'photo',
      year: 2023,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-URL embedUrl', () => {
    const result = canopySchema.safeParse({
      title: 'A track',
      kind: 'music',
      year: 2024,
      embedUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects year below 1900', () => {
    const result = canopySchema.safeParse({
      title: 'Ancient poem',
      kind: 'poem',
      year: 1800,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = canopySchema.safeParse({ kind: 'poem', year: 2023 });
    expect(result.success).toBe(false);
  });
});
