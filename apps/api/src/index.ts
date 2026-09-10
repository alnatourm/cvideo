import { createApp } from './app.js';
import { DrizzleAuthRepository } from './auth/drizzle-repository.js';
import { AuthService } from './auth/service.js';
import { DrizzleCandidateRepository } from './candidate/drizzle-repository.js';
import { CandidateService } from './candidate/service.js';
import { createDatabase } from './db/client.js';
import { DrizzleDiscoveryRepository } from './discovery/drizzle-repository.js';
import { DiscoveryService } from './discovery/service.js';
import { DrizzleInterviewsRepository } from './interviews/drizzle-repository.js';
import { DeferredGoogleMeetProvider } from './interviews/meeting-provider.js';
import { InterviewsService } from './interviews/service.js';
import { DrizzleMediaRepository } from './media/drizzle-repository.js';
import { BunnyStreamVideoProvider, DeferredVideoProvider } from './media/provider.js';
import { MediaService } from './media/service.js';
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
const interviewsService = new InterviewsService(new DrizzleInterviewsRepository(db), new DeferredGoogleMeetProvider());

const bunnyLibraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
const bunnyApiKey = process.env.BUNNY_STREAM_API_KEY;
const bunnyCdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME;
const videoProvider =
  bunnyLibraryId && bunnyApiKey && bunnyCdnHostname
    ? new BunnyStreamVideoProvider({ libraryId: bunnyLibraryId, apiKey: bunnyApiKey, cdnHostname: bunnyCdnHostname })
    : new DeferredVideoProvider();
const mediaService = new MediaService(new DrizzleMediaRepository(db), videoProvider);

const messagingService = new MessagingService(new DrizzleMessagingRepository(db));
const savedListsService = new SavedListsService(new DrizzleSavedListsRepository(db));
const taxonomyService = new TaxonomyService(new DrizzleTaxonomyRepository(db));
const app = createApp({
  authService,
  candidateService,
  discoveryService,
  interviewsService,
  mediaService,
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
