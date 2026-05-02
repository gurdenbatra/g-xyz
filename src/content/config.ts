import { defineCollection, z } from 'astro:content';
import { projectSchema, poemSchema, artSchema } from './schemas';

export const collections = {
  projects: defineCollection({ type: 'content', schema: projectSchema }),
  poems:    defineCollection({ type: 'content', schema: poemSchema }),
  art:      defineCollection({ type: 'content', schema: artSchema }),
};
