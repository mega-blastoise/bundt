import { z } from 'zod';

export const smolResponseSchema = z.object({
  summary: z.string().describe('Brief summary of what was done'),
  filesChanged: z.array(z.string()).describe('Absolute paths of files created, modified, or deleted'),
  errors: z.array(z.string()).describe('Any errors encountered during execution. Empty array if none')
});

export type SmolResponse = z.infer<typeof smolResponseSchema>;

export const smolJsonSchema = JSON.stringify(z.toJSONSchema(smolResponseSchema));
