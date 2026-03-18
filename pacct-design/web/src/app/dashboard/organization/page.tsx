'use client';

import { useState, useEffect, useRef, Suspense, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import AdminTabNav, { type AdminTab } from '@/components/admin/AdminTabNav';
import { StatusToast, type StatusType } from '@/app/dashboard/infrastructure/_components/shared';
import RmSelect from '@/components/ui/RmSelect';
import CreditsSection from './_components/CreditsSection';

// ─── Types ───────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
  verified: boolean;
  verified_at: string | null;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '??';
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString();
}

const ROLE_OPTIONS: { value: Member['role']; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

const STATUS_OPTIONS: { value: Member['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  owner: { bg: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' },
  admin: { bg: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)' },
  member: { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)' },
  pending: { bg: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' },
  inactive: { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' },
};

// ─── Tabs ────────────────────────────────────────────────────────────────

const TABS: AdminTab[] = [
  { key: 'team', label: 'Team', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { key: 'roles', label: 'Roles & Access', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> },
  { key: 'billing', label: 'Credits', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
  { key: 'api-access', label: 'API Access', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg> },
];

// ─── Actions Menu ────────────────────────────────────────────────────────

function ActionsMenu({ member, isLastAdmin, onViewDetails, onEdit, onVerify, onRemove }: {
  member: Member;
  isLastAdmin: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onVerify: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items: { label: string; onClick: () => void; color?: string; disabled?: boolean }[] = [
    { label: 'View Details', onClick: onViewDetails },
    { label: 'Edit', onClick: onEdit },
  ];
  if (!member.verified || member.status === 'pending') {
    items.push({ label: 'Send Verification', onClick: onVerify });
  }
  if (member.role !== 'owner') {
    const canRemove = !(isLastAdmin && member.role === 'admin');
    items.push({ label: canRemove ? 'Remove' : 'Remove (last admin)', onClick: onRemove, color: 'var(--rm-fail)', disabled: !canRemove });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-[12px] px-2 py-1 rounded transition-colors"
        style={{ color: 'var(--rm-text-muted)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-50 shadow-lg py-1"
          style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)', minWidth: '160px' }}
        >
          {items.map(item => (
            <button
              key={item.label}
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onClick(); }}
              className="w-full text-left px-3 py-1.5 text-[12px] transition-colors"
              style={{ color: item.color || 'var(--rm-text)', opacity: item.disabled ? 0.4 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────

function MemberDetailPanel({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <tr>
      <td colSpan={5} style={{ padding: 0 }}>
        <div className="p-4 m-1 rounded-lg" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-semibold" style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}>
                {getInitials(member.name)}
              </div>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>{member.name}</div>
                <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>{member.email}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded" style={{ color: 'var(--rm-text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>Role</div>
              <span className="text-[12px] px-2 py-0.5 rounded inline-block mt-1" style={{ background: ROLE_COLORS[member.role].bg, color: ROLE_COLORS[member.role].color }}>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>Status</div>
              <span className="text-[12px] px-2 py-0.5 rounded inline-block mt-1" style={{ background: STATUS_COLORS[member.status].bg, color: STATUS_COLORS[member.status].color }}>{member.status.charAt(0).toUpperCase() + member.status.slice(1)}</span>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>Verified</div>
              <div className="text-[12px] mt-1" style={{ color: member.verified ? 'var(--rm-pass)' : 'var(--rm-caution)' }}>
                {member.verified ? (
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified {member.verified_at && `on ${new Date(member.verified_at).toLocaleDateString()}`}
                  </span>
                ) : 'Not verified'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>Last Active</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--rm-text-secondary)' }}>{formatRelativeTime(member.last_active)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>Joined</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--rm-text-secondary)' }}>{new Date(member.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────

function EditMemberModal({ member, isLastAdmin, onSave, onCancel, saving }: {
  member: Member;
  isLastAdmin: boolean;
  onSave: (updates: Partial<Member>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const canChangeRole = member.role !== 'owner' && !(isLastAdmin && member.role === 'admin');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        <h3 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>Edit Member</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Email</label>
            <input
              type="text"
              value={member.email}
              disabled
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none opacity-50"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          </div>
          {member.role !== 'owner' && (
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Role</label>
              <RmSelect
                value={role}
                onChange={v => setRole(v as Member['role'])}
                options={ROLE_OPTIONS}
                disabled={!canChangeRole}
              />
              {!canChangeRole && <p className="text-[11px] mt-1" style={{ color: 'var(--rm-caution)' }}>Cannot change role — last admin</p>}
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Status</label>
            <RmSelect
              value={status}
              onChange={v => setStatus(v as Member['status'])}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="btn text-[13px] px-4 py-1.5" style={{ color: 'var(--rm-text-secondary)' }}>Cancel</button>
          <button
            onClick={() => onSave({ name, role: (member.role === 'owner' || !canChangeRole) ? member.role : role, status })}
            disabled={saving || !name.trim()}
            className="btn btn-primary text-[13px] px-4 py-1.5"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function OrganizationPage() {
  return (
    <Suspense fallback={<PortalLayout><PageHeader title="Organization" description="Manage your team and settings" /><div className="text-center py-12" style={{ color: 'var(--rm-text-muted)' }}>Loading...</div></PortalLayout>}>
      <OrganizationPageInner />
    </Suspense>
  );
}

function OrganizationPageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'team';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Member state ───────────────────────────────────────────────────
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusType>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Detail / edit / verify
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  // ── Fetch members ──────────────────────────────────────────────────
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/organization/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const showStatusMsg = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    if (type === 'success') {
      setTimeout(() => setStatus(prev => prev?.type === 'success' ? null : prev), 4000);
    }
  };

  // ── Invite (Add) ──────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch('/api/organization/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          status: 'pending',
          verified: false,
          verified_at: null,
          last_active: null,
          created_at: now,
          updated_at: now,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => [data.member, ...prev]);
        setInviteName(''); setInviteEmail(''); setInviteRole('member');
        setShowInvite(false);
        showStatusMsg('success', `Invitation sent to ${inviteEmail.trim()}`);
      } else {
        const err = await res.json();
        showStatusMsg('error', err.error || 'Failed to invite member');
      }
    } catch {
      showStatusMsg('error', 'Network error');
    }
    setInviting(false);
  };

  // ── Edit ──────────────────────────────────────────────────────────
  const handleEditSave = async (updates: Partial<Member>) => {
    if (!editMember) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const updated = { ...editMember, ...updates, updated_at: now };
      const res = await fetch(`/api/organization/members/${editMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => prev.map(m => m.id === editMember.id ? data.member : m));
        setEditMember(null);
        showStatusMsg('success', `${updated.name} updated`);
      } else {
        const err = await res.json();
        showStatusMsg('error', err.error || 'Failed to update');
      }
    } catch {
      showStatusMsg('error', 'Network error');
    }
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────
  const adminCount = members.filter(m => m.role === 'owner' || m.role === 'admin').length;

  const handleRemove = async (member: Member) => {
    if (member.role === 'owner') return;
    if ((member.role === 'admin') && adminCount <= 1) {
      showStatusMsg('error', 'Cannot remove the last admin');
      return;
    }
    if (!confirm(`Remove "${member.name}" from the organization? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/organization/members/${member.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== member.id));
        if (detailId === member.id) setDetailId(null);
        showStatusMsg('success', `${member.name} removed`);
      } else {
        const err = await res.json();
        showStatusMsg('error', err.error || 'Failed to remove');
      }
    } catch {
      showStatusMsg('error', 'Network error');
    }
  };

  // ── Verify ────────────────────────────────────────────────────────
  const handleVerify = async (member: Member) => {
    setVerifying(member.id);
    try {
      const res = await fetch(`/api/organization/members/${member.id}/verify`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => prev.map(m => m.id === member.id ? data.member : m));
        showStatusMsg('success', `${member.name} verified`);
      } else {
        const err = await res.json();
        showStatusMsg('error', err.error || 'Verification failed');
      }
    } catch {
      showStatusMsg('error', 'Network error');
    }
    setVerifying(null);
  };

  return (
    <PortalLayout>
      <PageHeader title="Organization" description="Manage your team and settings" />

      <div className="flex gap-8">
        <AdminTabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 min-w-0">
          {status && <div className="mb-4"><StatusToast status={status} /></div>}

          {/* ── Team Tab ────────────────────────────────────────────── */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[16px] font-semibold" style={{ color: 'var(--rm-text)' }}>Team Members</h2>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
                      {loading ? 'Loading...' : `${members.length} member${members.length !== 1 ? 's' : ''} in your organization`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowInvite(!showInvite); if (!showInvite) setTimeout(() => nameRef.current?.focus(), 50); }}
                    className="btn btn-primary text-[13px]"
                  >
                    {showInvite ? 'Cancel' : 'Invite Member'}
                  </button>
                </div>

                {/* Invite form */}
                {showInvite && (
                  <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                    <h4 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--rm-text)' }}>Invite New Member</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Name</label>
                        <input
                          ref={nameRef}
                          type="text"
                          value={inviteName}
                          onChange={e => setInviteName(e.target.value)}
                          placeholder="Full name"
                          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                          style={{ background: 'var(--rm-bg-surface)', color: 'var(--rm-text)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Email</label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          placeholder="email@company.com"
                          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                          style={{ background: 'var(--rm-bg-surface)', color: 'var(--rm-text)' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-3 mt-3">
                      <div className="flex-1">
                        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Role</label>
                        <RmSelect
                          value={inviteRole}
                          onChange={v => setInviteRole(v as 'admin' | 'member')}
                          options={ROLE_OPTIONS}
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={handleInvite}
                        disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
                        className="btn btn-primary text-[13px] px-5 py-2"
                      >
                        {inviting ? 'Sending...' : 'Send Invite'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Members table */}
                {loading ? (
                  <div className="text-center py-8" style={{ color: 'var(--rm-text-muted)' }}>Loading members...</div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--rm-text-muted)' }}>
                    <p className="text-[14px]">No team members yet.</p>
                    <p className="text-[12px] mt-1">Invite your first team member to get started.</p>
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ overflow: 'visible' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Active</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member) => (
                          <Fragment key={member.id}>
                            <tr
                              className="cursor-pointer transition-colors"
                              onClick={() => setDetailId(detailId === member.id ? null : member.id)}
                              style={detailId === member.id ? { background: 'var(--rm-signal-glow)' } : undefined}
                            >
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0" style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}>
                                    {getInitials(member.name)}
                                  </div>
                                  <div>
                                    <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{member.name}</div>
                                    <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>{member.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="text-[12px] px-2 py-0.5 rounded" style={{ background: ROLE_COLORS[member.role].bg, color: ROLE_COLORS[member.role].color }}>
                                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] px-2 py-0.5 rounded" style={{ background: STATUS_COLORS[member.status].bg, color: STATUS_COLORS[member.status].color }}>
                                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                                  </span>
                                  {member.verified && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                  )}
                                  {!member.verified && member.status === 'pending' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleVerify(member); }}
                                      disabled={verifying === member.id}
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors"
                                      style={{ background: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)', cursor: verifying === member.id ? 'wait' : 'pointer' }}
                                    >
                                      {verifying === member.id ? 'Verifying...' : 'Verify'}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td style={{ color: 'var(--rm-text-muted)' }}>{formatRelativeTime(member.last_active)}</td>
                              <td onClick={e => e.stopPropagation()}>
                                <ActionsMenu
                                  member={member}
                                  isLastAdmin={adminCount <= 1}
                                  onViewDetails={() => setDetailId(detailId === member.id ? null : member.id)}
                                  onEdit={() => setEditMember(member)}
                                  onVerify={() => handleVerify(member)}
                                  onRemove={() => handleRemove(member)}
                                />
                              </td>
                            </tr>
                            {detailId === member.id && (
                              <MemberDetailPanel
                                member={member}
                                onClose={() => setDetailId(null)}
                              />
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Roles & Access Tab ──────────────────────────────────── */}
          {activeTab === 'roles' && (
            <div className="card">
              <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Roles & Access</h3>
              <p className="text-[12px] mb-6" style={{ color: 'var(--rm-text-muted)' }}>Define roles and manage access controls for your organization</p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--rm-bg-raised)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--rm-text-muted)' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <div className="text-[14px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Coming Soon</div>
                <div className="text-[12px] max-w-xs" style={{ color: 'var(--rm-text-muted)' }}>Role definitions and access controls will be available in an upcoming release.</div>
              </div>
            </div>
          )}

          {/* ── Credits Tab ─────────────────────────────────────────── */}
          {activeTab === 'billing' && <CreditsSection />}

          {/* ── API Access Tab ──────────────────────────────────────── */}
          {activeTab === 'api-access' && (
            <div className="card">
              <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>API Access</h3>
              <p className="text-[12px] mb-6" style={{ color: 'var(--rm-text-muted)' }}>Manage API keys and access tokens</p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--rm-bg-raised)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--rm-text-muted)' }}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                </div>
                <div className="text-[14px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Coming Soon</div>
                <div className="text-[12px] max-w-xs" style={{ color: 'var(--rm-text-muted)' }}>API key management and access tokens will be available in an upcoming release.</div>
              </div>
            </div>
          )}

          {/* Edit modal */}
          {editMember && (
            <EditMemberModal
              member={editMember}
              isLastAdmin={adminCount <= 1}
              onSave={handleEditSave}
              onCancel={() => setEditMember(null)}
              saving={saving}
            />
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
