import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cvideo-api',
    version: 'v1',
  });
});

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      details: {},
    },
  });
});

app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', service: 'cvideo-api', message: 'server_started', port }));
});
