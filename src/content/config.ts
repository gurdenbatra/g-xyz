import { defineCollection } from 'astro:content';
import { projectSchema, mulchSchema, nowSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  mulch:    defineCollection({ type: 'content', schema: mulchSchema }),
  now:      defineCollection({ type: 'content', schema: nowSchema }),
};
