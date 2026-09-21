import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
});

const parsedEnvironment = envSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  console.error('Invalid environment configuration', parsedEnvironment.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnvironment.data;
