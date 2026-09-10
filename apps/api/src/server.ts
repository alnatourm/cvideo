import express from 'express';
import cors from 'cors';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
});

const env = envSchema.parse(process.env);
const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cvideo-api',
    version: 'v1',
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.listen(env.PORT, () => {
  console.log(`CVIDEO API listening on port ${env.PORT}`);
});
