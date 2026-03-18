import type { NetworkState, NodeId, Timestamp, MemberInfo } from '@pacct/protocol-ts';
import { MemberStatus } from '@pacct/protocol-ts';

export function addMember(
  state: NetworkState,
  nodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  const member: MemberInfo = {
    nodeId,
    status: MemberStatus.Active,
    joinedAt: timestamp,
    acknowledgedAt: timestamp,
  };
  return {
    ...state,
    members: [...state.members, member],
  };
}

export function removeMember(
  state: NetworkState,
  nodeId: NodeId,
  reason: 'left' | 'expelled',
  timestamp: Timestamp,
): NetworkState {
  const status =
    reason === 'left' ? MemberStatus.Left : MemberStatus.Expelled;

  return {
    ...state,
    members: state.members.map((m) =>
      m.nodeId === nodeId
        ? { ...m, status, leftAt: timestamp }
        : m,
    ),
  };
}

export function reAcknowledge(
  state: NetworkState,
  nodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  return {
    ...state,
    members: state.members.map((m) =>
      m.nodeId === nodeId && m.status === MemberStatus.PendingReAck
        ? { ...m, status: MemberStatus.Active, acknowledgedAt: timestamp }
        : m,
    ),
  };
}

export function allMembersReAcknowledged(state: NetworkState): boolean {
  const livingMembers = state.members.filter(
    (m) =>
      m.status !== MemberStatus.Left && m.status !== MemberStatus.Expelled,
  );
  return livingMembers.every((m) => m.status === MemberStatus.Active || m.status === MemberStatus.Offline);
}

export function getActiveMembers(state: NetworkState): MemberInfo[] {
  return state.members.filter(
    (m) => m.status === MemberStatus.Active || m.status === MemberStatus.Offline,
  );
}

export function getActiveAcknowledgedMembers(
  state: NetworkState,
): MemberInfo[] {
  return state.members.filter((m) => m.status === MemberStatus.Active);
}

export function isNetworkComputationCapable(
  state: NetworkState,
  minActiveMembers: number,
): boolean {
  return getActiveMembers(state).length >= minActiveMembers;
}

export function setMemberOffline(
  state: NetworkState,
  nodeId: NodeId,
): NetworkState {
  return {
    ...state,
    members: state.members.map((m) =>
      m.nodeId === nodeId && m.status === MemberStatus.Active
        ? { ...m, status: MemberStatus.Offline }
        : m,
    ),
  };
}

export function setMemberOnline(
  state: NetworkState,
  nodeId: NodeId,
): NetworkState {
  return {
    ...state,
    members: state.members.map((m) =>
      m.nodeId === nodeId && m.status === MemberStatus.Offline
        ? { ...m, status: MemberStatus.Active }
        : m,
    ),
  };
}

export function allRequiredMembersOnline(state: NetworkState): boolean {
  const livingMembers = state.members.filter(
    (m) =>
      m.status !== MemberStatus.Left && m.status !== MemberStatus.Expelled,
  );
  return livingMembers.every((m) => m.status === MemberStatus.Active);
}
