import { createApp } from './app.js';
import { DrizzleAuthRepository } from './auth/drizzle-repository.js';
import { AuthService } from './auth/service.js';
import { DrizzleCandidateRepository } from './candidate/drizzle-repository.js';
import { CandidateService } from './candidate/service.js';
import { createDatabase } from './db/client.js';
import { DrizzleDiscoveryRepository } from './discovery/drizzle-repository.js';
import { DiscoveryService } from './discovery/service.js';
import { DrizzleMessagingRepository } from './messaging/drizzle-repository.js';
import { MessagingService } from './messaging/service.js';
import { DrizzleSavedListsRepository } from './saved-lists/drizzle-repository.js';
import { SavedListsService } from './saved-lists/service.js';
import { DrizzleTaxonomyRepository } from './taxonomy/drizzle-repository.js';
import { TaxonomyService } from './taxonomy/service.js';

const port = Number(process.env.PORT ?? 4000);
const databaseUrl = process.env.DATABASE_URL ?? '';
const { db, client } = createDatabase(databaseUrl);
const authService = new AuthService(new DrizzleAuthRepository(db));
const candidateService = new CandidateService(new DrizzleCandidateRepository(db));
const discoveryService = new DiscoveryService(new DrizzleDiscoveryRepository(db));
const messagingService = new MessagingService(new DrizzleMessagingRepository(db));
const savedListsService = new SavedListsService(new DrizzleSavedListsRepository(db));
const taxonomyService = new TaxonomyService(new DrizzleTaxonomyRepository(db));
const app = createApp({
  authService,
  candidateService,
  discoveryService,
  messagingService,
  savedListsService,
  taxonomyService,
});

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
