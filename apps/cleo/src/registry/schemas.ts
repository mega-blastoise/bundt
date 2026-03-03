import { z } from 'zod';
import { QualifiedNameSchema } from '../types';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

export const RegistryEntrySchema = z.object({
  qualifiedName: QualifiedNameSchema,
  type: z.union([z.literal('agent'), z.literal('skill')]),
  description: z.string().min(10).max(200),
  author: z.string().min(1),
  tags: z.array(z.string()).min(1).max(10),
  path: z.string().min(1),
  skills: z.array(z.string()).optional(),
  updatedAt: z.string().optional()
});

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

export const RegistryIndexSchema = z.object({
  version: z.literal(1),
  entries: z.array(RegistryEntrySchema)
});

export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;

export const SubmissionMetadataSchema = z.object({
  namespace: z.string().regex(KEBAB, 'Must be kebab-case'),
  name: z.string().regex(KEBAB, 'Must be kebab-case'),
  description: z.string().min(10).max(200),
  version: z.string().regex(SEMVER, 'Must be semver (e.g. 1.0.0)'),
  author: z.string().min(1),
  tags: z.array(z.string()).min(1).max(10)
});

export type SubmissionMetadata = z.infer<typeof SubmissionMetadataSchema>;
