import { z } from 'zod';

export const projectSchema = z.object({
  title:         z.string(),
  description:   z.string(),
  role:          z.string(),
  year:          z.number().int().min(1990).max(2100),
  tags:          z.array(z.string()).min(1),
  collaborators: z.array(z.string()).optional(),
  links:         z.array(
    z.object({ label: z.string(), url: z.string().url() })
  ).optional(),
  featured:      z.boolean().default(false),
  heroImage:     z.string().optional(),
});

export const poemSchema = z.object({
  title:        z.string(),
  date:         z.date(),
  customLayout: z.boolean().default(false),
});

export const artSchema = z.object({
  title:     z.string(),
  date:      z.date(),
  medium:    z.enum(['canvas', 'webgl', 'svg', 'p5', 'static']),
  sourceUrl: z.string().url().optional(),
  liveEmbed: z.boolean().default(false),
}).refine(
  (data) => !data.liveEmbed || data.sourceUrl !== undefined,
  { message: 'sourceUrl is required when liveEmbed is true', path: ['sourceUrl'] }
);
