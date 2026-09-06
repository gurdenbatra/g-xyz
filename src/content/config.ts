import { defineCollection, z } from 'astro:content';
import { projectSchema, mulchSchema, nowSchema } from './schemas';

export const collections = {
  // heroImage/media use Astro's image() so they're validated at build and
  // optimised (responsive AVIF/WebP) via astro:assets. Videos are plain paths
  // under public/ (not image-processed) with an optional optimised poster.
  projects: defineCollection({
    type: 'content',
    schema: ({ image }) =>
      projectSchema.extend({
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        media: z
          .array(
            z.discriminatedUnion('kind', [
              z.object({
                kind: z.literal('image'),
                src: image(),
                alt: z.string(),
                caption: z.string().optional(),
              }),
              z.object({
                kind: z.literal('video'),
                src: z.string(),
                poster: image().optional(),
                alt: z.string(),
                caption: z.string().optional(),
              }),
            ]),
          )
          .optional(),
      }),
  }),
  mulch:    defineCollection({ type: 'content', schema: mulchSchema }),
  now:      defineCollection({ type: 'content', schema: nowSchema }),
};
