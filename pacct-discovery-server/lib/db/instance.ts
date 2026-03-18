import { DiscoveryDatabase } from './database';
import { NetworkRepository } from './repositories/network-repository';
import { MemberRepository } from './repositories/member-repository';
import { ApplicantRepository } from './repositories/applicant-repository';
import { VoteRepository } from './repositories/vote-repository';
import { ManifestRepository } from './repositories/manifest-repository';
import { PresenceRepository } from './repositories/presence-repository';
import { EventRepository } from './repositories/event-repository';

let _db: DiscoveryDatabase | null = null;

function getDatabase(): DiscoveryDatabase {
  if (!_db) {
    const dbPath = process.env.DISCOVERY_DB_PATH ?? 'discovery.db';
    _db = new DiscoveryDatabase(dbPath);
  }
  return _db;
}

export function getDb(): DiscoveryDatabase {
  return getDatabase();
}

export function getNetworkRepo(): NetworkRepository {
  return new NetworkRepository(getDatabase());
}

export function getMemberRepo(): MemberRepository {
  return new MemberRepository(getDatabase());
}

export function getApplicantRepo(): ApplicantRepository {
  return new ApplicantRepository(getDatabase());
}

export function getVoteRepo(): VoteRepository {
  return new VoteRepository(getDatabase());
}

export function getManifestRepo(): ManifestRepository {
  return new ManifestRepository(getDatabase());
}

export function getPresenceRepo(): PresenceRepository {
  return new PresenceRepository(getDatabase());
}

export function getEventRepo(): EventRepository {
  return new EventRepository(getDatabase());
}
