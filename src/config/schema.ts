import { z } from 'zod';

// Configuration schema using Zod
export const configSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  port: z.number().int().positive().default(24312),
  summaryOptions: z.object({
    detailLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    maxLength: z.number().int().positive().default(500)
  }).default({
    detailLevel: 'medium',
    maxLength: 500
  })
});

// Derive the type from the schema
export type ConfigType = z.infer<typeof configSchema>;

// Default configuration
export const defaultConfig: ConfigType = {
  apiKey: '',
  port: 24312,
  summaryOptions: {
    detailLevel: 'medium',
    maxLength: 500
  }
};