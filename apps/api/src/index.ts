import { createApp } from './app.js';
import { DrizzleAuthRepository } from './auth/drizzle-repository.js';
import { AuthService } from './auth/service.js';
import { DrizzleCandidateRepository } from './candidate/drizzle-repository.js';
import { CandidateService } from './candidate/service.js';
import { createDatabase } from './db/client.js';
import { DrizzleDiscoveryRepository } from './discovery/drizzle-repository.js';
import { DiscoveryService } from './discovery/service.js';

const port = Number(process.env.PORT ?? 4000);
const databaseUrl = process.env.DATABASE_URL ?? '';
const { db, client } = createDatabase(databaseUrl);
const authService = new AuthService(new DrizzleAuthRepository(db));
const candidateService = new CandidateService(new DrizzleCandidateRepository(db));
const discoveryService = new DiscoveryService(new DrizzleDiscoveryRepository(db));
const app = createApp({ authService, candidateService, discoveryService });

const server = app.listen(port, () => {
  console.log(JSON.stringify({ level: 'info', service: 'cvideo-api', message: 'server_started', port }));
});

async function shutdown(signal: string) {
  console.log(JSON.stringify({ level: 'info', service: 'cvideo-api', message: 'shutdown', signal }));
  server.close(async () => {
    await client.end({ timeout: 5 });
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
