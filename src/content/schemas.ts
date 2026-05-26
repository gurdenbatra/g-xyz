import { z } from 'zod';

export const PLANT_TYPES = ['fern', 'sunflower', 'thistle', 'vine', 'grass', 'shrub'] as const;
export type PlantType = (typeof PLANT_TYPES)[number];

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
  plantType:     z.enum(PLANT_TYPES).optional(),
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

export const nowSchema = z.object({
  carrying: z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  reading:  z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  contact:  z.array(z.object({
    label:  z.string().min(1),
    url:    z.union([z.string().url(), z.string().startsWith('mailto:')]),
    detail: z.string().min(1).optional(),
  })).min(1),
});
