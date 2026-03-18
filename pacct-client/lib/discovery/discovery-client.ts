import type {
  NetworkId,
  NodeId,
  Timestamp,
  Vote,
  MemberInfo,
  ApplicantInfo,
  ApprovalVote,
  PacctEvent,
} from '@pacct/protocol-ts';

// ── Request / Response types ──

export interface RegisterNetworkParams {
  networkId: NetworkId;
  alias: string;
  creatorNodeId: NodeId;
  manifest: unknown;
}

export interface NetworkInfo {
  networkId: NetworkId;
  alias: string;
  status: string;
  creatorNodeId: NodeId;
  createdAt: Timestamp;
}

export interface MemberUpdate {
  status?: string;
  leftAt?: Timestamp;
}

export interface ApplicantUpdate {
  status?: string;
  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  acceptedAt?: Timestamp;
  withdrawnAt?: Timestamp;
  expiredAt?: Timestamp;
}

export interface VotePayload {
  voterNodeId: NodeId;
  vote: Vote;
  timestamp: Timestamp;
  signature: string;
}

export interface ManifestInfo {
  networkId: NetworkId;
  manifest: unknown;
}

export interface PresenceInfo {
  nodeId: NodeId;
  online: boolean;
  lastSeen: Timestamp;
}

export type EventInfo = PacctEvent;

// ── Client ──

export class DiscoveryClient {
  constructor(private baseUrl: string) {}

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Discovery API error ${res.status}: ${text}`);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json() as Promise<T>;
    }
    return undefined as unknown as T;
  }

  // Networks
  async registerNetwork(params: RegisterNetworkParams): Promise<NetworkInfo> {
    return this.request<NetworkInfo>('/networks', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async listNetworks(filter?: { status?: string }): Promise<NetworkInfo[]> {
    const qs = filter?.status ? `?status=${encodeURIComponent(filter.status)}` : '';
    return this.request<NetworkInfo[]>(`/networks${qs}`);
  }

  async getNetwork(networkId: string): Promise<NetworkInfo> {
    return this.request<NetworkInfo>(`/networks/${networkId}`);
  }

  async updateNetworkStatus(networkId: string, status: string): Promise<void> {
    await this.request<void>(`/networks/${networkId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Members
  async getMembers(networkId: string): Promise<MemberInfo[]> {
    return this.request<MemberInfo[]>(`/networks/${networkId}/members`);
  }

  async addMember(networkId: string, nodeId: string, joinedAt: number): Promise<void> {
    await this.request<void>(`/networks/${networkId}/members`, {
      method: 'POST',
      body: JSON.stringify({ nodeId, joinedAt }),
    });
  }

  async updateMember(
    networkId: string,
    nodeId: string,
    update: MemberUpdate,
  ): Promise<void> {
    await this.request<void>(`/networks/${networkId}/members/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // Applicants
  async submitApplication(networkId: string, nodeId: string): Promise<void> {
    await this.request<void>(`/networks/${networkId}/applicants`, {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
    });
  }

  async getApplicants(networkId: string): Promise<ApplicantInfo[]> {
    return this.request<ApplicantInfo[]>(`/networks/${networkId}/applicants`);
  }

  async getApplicant(networkId: string, nodeId: string): Promise<ApplicantInfo> {
    return this.request<ApplicantInfo>(
      `/networks/${networkId}/applicants/${nodeId}`,
    );
  }

  async updateApplicant(
    networkId: string,
    nodeId: string,
    update: ApplicantUpdate,
  ): Promise<void> {
    await this.request<void>(`/networks/${networkId}/applicants/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // Votes
  async castVote(
    networkId: string,
    applicantNodeId: string,
    vote: VotePayload,
  ): Promise<void> {
    await this.request<void>(
      `/networks/${networkId}/applicants/${applicantNodeId}/votes`,
      {
        method: 'POST',
        body: JSON.stringify(vote),
      },
    );
  }

  async getVotes(
    networkId: string,
    applicantNodeId: string,
  ): Promise<ApprovalVote[]> {
    return this.request<ApprovalVote[]>(
      `/networks/${networkId}/applicants/${applicantNodeId}/votes`,
    );
  }

  // Manifests
  async getManifests(networkId: string): Promise<ManifestInfo> {
    return this.request<ManifestInfo>(`/networks/${networkId}/manifests`);
  }

  // Presence
  async sendHeartbeat(networkId: string, nodeId: string): Promise<void> {
    await this.request<void>(`/networks/${networkId}/presence/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
    });
  }

  async getPresence(networkId: string): Promise<PresenceInfo[]> {
    return this.request<PresenceInfo[]>(`/networks/${networkId}/presence`);
  }

  // Events
  async getEvents(
    networkId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<EventInfo[]> {
    const params = new URLSearchParams();
    if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts?.offset !== undefined) params.set('offset', String(opts.offset));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<EventInfo[]>(`/networks/${networkId}/events${qs}`);
  }
}
