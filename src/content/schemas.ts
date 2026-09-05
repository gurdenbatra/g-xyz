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

export const mulchSchema = z.object({
  title:       z.string(),
  kind:        z.enum(['poem', 'essay', 'music', 'av']),
  year:        z.number().int().min(1900).max(2100),
  description: z.string().optional(),
  embedUrl:    z.string().url().optional(),
}).refine(
  (d) => !['music', 'av'].includes(d.kind) || d.embedUrl !== undefined,
  { message: 'embedUrl required for music and av', path: ['embedUrl'] }
);

export const nowSchema = z.object({
  carrying: z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  contact:  z.array(z.object({
    label:  z.string().min(1),
    url:    z.union([z.string().url(), z.string().startsWith('mailto:')]),
    detail: z.string().min(1).optional(),
  })).min(1),
});
