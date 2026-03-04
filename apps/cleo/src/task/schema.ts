import { z } from 'zod';

export const PRIORITY_VALUES = ['critical', 'high', 'normal', 'low', 'background'] as const;
export type Priority = (typeof PRIORITY_VALUES)[number];

export const taskFileSchema = z.object({
  path: z.string().min(1),
  priority: z.enum(PRIORITY_VALUES).default('normal'),
  summary: z.string().optional()
});

export type TaskFile = z.infer<typeof taskFileSchema>;

export const taskCommandSchema = z.object({
  run: z.string().min(1),
  priority: z.enum(PRIORITY_VALUES).default('high'),
  summary: z.string().optional()
});

export type TaskCommand = z.infer<typeof taskCommandSchema>;

export const taskDocumentSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  format: z.string().default('markdown'),
  priority: z.enum(PRIORITY_VALUES).default('normal'),
  summary: z.string().optional()
});

export type TaskDocument = z.infer<typeof taskDocumentSchema>;

export const taskDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1),
  files: z.array(taskFileSchema).default([]),
  commands: z.array(taskCommandSchema).default([]),
  documents: z.array(taskDocumentSchema).default([]),
  budget: z.number().positive().optional(),
  model: z.string().default('claude-sonnet-4-6'),
  maxBudgetUsd: z.number().positive().optional()
});

export type TaskDefinition = z.infer<typeof taskDefinitionSchema>;
