import { defineCollection } from 'astro:content';
import { projectSchema, canopySchema, nowSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  canopy:   defineCollection({ type: 'content', schema: canopySchema }),
  now:      defineCollection({ type: 'content', schema: nowSchema }),
};
