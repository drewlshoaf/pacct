import { getPool } from './pool';
import { NetworkRepository } from './repositories/network-repository';
import { MemberRepository } from './repositories/member-repository';
import { ApplicantRepository } from './repositories/applicant-repository';
import { VoteRepository } from './repositories/vote-repository';
import { ManifestRepository } from './repositories/manifest-repository';
import { PresenceRepository } from './repositories/presence-repository';
import { EventRepository } from './repositories/event-repository';

export function getNetworkRepo(): NetworkRepository {
  return new NetworkRepository(getPool());
}

export function getMemberRepo(): MemberRepository {
  return new MemberRepository(getPool());
}

export function getApplicantRepo(): ApplicantRepository {
  return new ApplicantRepository(getPool());
}

export function getVoteRepo(): VoteRepository {
  return new VoteRepository(getPool());
}

export function getManifestRepo(): ManifestRepository {
  return new ManifestRepository(getPool());
}

export function getPresenceRepo(): PresenceRepository {
  return new PresenceRepository(getPool());
}

export function getEventRepo(): EventRepository {
  return new EventRepository(getPool());
}
