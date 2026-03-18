'use client';

import { useState, useEffect, useRef } from 'react';
import { ConfigCard, StatusToast, type StatusType } from './shared';
import type { EnvironmentEntry } from '@/lib/api';
import RmSelect from '@/components/ui/RmSelect';

// ─── Environment Type badge colors ──────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  production: 'var(--rm-fail)',
  staging: 'var(--rm-caution)',
  qa: 'var(--rm-signal)',
  development: 'var(--rm-pass)',
  custom: 'var(--rm-text-muted)',
};

const TYPE_OPTIONS = ['staging', 'production', 'qa', 'development', 'custom'];

// ─── Component ──────────────────────────────────────────────────────────

export default function EnvironmentsView() {
  const [environments, setEnvironments] = useState<EnvironmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [status, setStatus] = useState<StatusType>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [expandedDns, setExpandedDns] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('staging');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Load environments on mount
  useEffect(() => {
    fetchEnvs();
  }, []);

  const fetchEnvs = async () => {
    try {
      const res = await fetch('/api/environments');
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data.environments ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          name: newName.trim(),
          base_url: newUrl.trim(),
          type: newType,
          description: newDesc.trim(),
          is_default: false,
          verified: false,
          verification_token: null,
          verified_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnvironments(prev => [data.environment, ...prev]);
        setNewName(''); setNewUrl(''); setNewType('staging'); setNewDesc('');
        setShowAdd(false);
        setStatus({ type: 'success', message: 'Environment created. Follow the DNS instructions to verify ownership.' });
        // Auto-expand DNS panel for the new environment
        setExpandedDns(data.environment.id);
        setTimeout(() => setStatus(prev => prev?.type === 'success' ? null : prev), 5000);
      } else {
        const err = await res.json();
        setStatus({ type: 'error', message: err.error || 'Failed to create environment' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error' });
    }
    setSaving(false);
  };

  const handleVerify = async (id: string) => {
    setVerifying(id);
    setStatus(null);
    try {
      const res = await fetch(`/api/environments/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (data.verified) {
        setEnvironments(prev => prev.map(e =>
          e.id === id ? { ...e, verified: true, verified_at: new Date().toISOString() } : e
        ));
        setExpandedDns(null);
        setStatus({ type: 'success', message: 'DNS verification successful!' });
        setTimeout(() => setStatus(prev => prev?.type === 'success' ? null : prev), 5000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Verification failed — TXT record not found' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Verification request failed' });
    }
    setVerifying(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/environments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEnvironments(prev => prev.filter(e => e.id !== id));
        setStatus({ type: 'success', message: `"${name}" deleted.` });
        setTimeout(() => setStatus(prev => prev?.type === 'success' ? null : prev), 3000);
      } else {
        setStatus({ type: 'error', message: 'Failed to delete' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error' });
    }
    setDeleting(null);
  };

  const handleToggleDefault = async (id: string, currentlyDefault: boolean) => {
    setSettingDefault(id);
    setStatus(null);
    try {
      const res = await fetch(`/api/environments/${id}/default`, {
        method: currentlyDefault ? 'DELETE' : 'POST',
      });
      if (res.ok) {
        if (currentlyDefault) {
          // Cleared default
          setEnvironments(prev => prev.map(e =>
            e.id === id ? { ...e, is_default: false } : e
          ));
        } else {
          // Set new default — clear all others
          setEnvironments(prev => prev.map(e => ({
            ...e,
            is_default: e.id === id,
          })));
        }
      } else {
        setStatus({ type: 'error', message: 'Failed to update default environment' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error' });
    }
    setSettingDefault(null);
  };

  const extractDomain = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="card text-center py-12">
        <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading environments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {status && <StatusToast status={status} />}

      {/* Add Environment */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowAdd(!showAdd); if (!showAdd) setTimeout(() => nameRef.current?.focus(), 50); }}
          className="btn btn-primary text-[13px]"
        >
          {showAdd ? 'Cancel' : 'Add Environment'}
        </button>
      </div>

      {showAdd && (
        <ConfigCard title="New Environment" description="Add a deployment target. You'll need to verify domain ownership via a DNS TXT record.">
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Name</label>
              <input
                ref={nameRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Production API"
                className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Base URL</label>
              <input
                type="text"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="e.g. https://api.example.com"
                className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Type</label>
                <RmSelect
                  value={newType}
                  onChange={v => setNewType(v)}
                  options={TYPE_OPTIONS.map(t => ({ value: t, label: t }))}
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Description (optional)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Short description"
                  className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim() || !newUrl.trim()}
                className="btn btn-primary text-[13px]"
              >
                {saving ? 'Creating...' : 'Create Environment'}
              </button>
            </div>
          </div>
        </ConfigCard>
      )}

      {/* Environment List */}
      {environments.length === 0 && !showAdd ? (
        <ConfigCard title="No Environments" description="Add your first environment to start verifying deployment targets.">
          <div className="text-center py-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-muted)" strokeWidth="1.5" className="mx-auto mb-3">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
              Environments represent deployment targets like staging, production, or QA.
            </p>
          </div>
        </ConfigCard>
      ) : (
        <div className="space-y-3">
          {environments.map(env => (
            <div
              key={env.id}
              className="card"
              style={{ border: `1px solid ${env.verified ? 'var(--rm-border)' : 'rgba(217,164,65,0.25)'}` }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: env.verified ? 'var(--rm-pass)' : 'var(--rm-caution)' }}
                  />
                  <span className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>
                    {env.name}
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded font-medium"
                    style={{ background: 'var(--rm-bg-raised)', color: TYPE_COLORS[env.type] || 'var(--rm-text-muted)' }}
                  >
                    {env.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Default toggle */}
                  <button
                    onClick={() => handleToggleDefault(env.id, env.is_default)}
                    disabled={settingDefault === env.id}
                    title={env.is_default ? 'Remove as default' : 'Set as default'}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium transition-colors"
                    style={{
                      background: env.is_default ? 'var(--rm-signal-glow)' : 'transparent',
                      color: env.is_default ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
                      border: `1px solid ${env.is_default ? 'var(--rm-signal)' : 'var(--rm-border)'}`,
                      opacity: settingDefault === env.id ? 0.5 : 1,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={env.is_default ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Default
                  </button>

                  {env.verified ? (
                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      Verified
                      {env.verified_at && (
                        <span className="ml-1 opacity-70">{new Date(env.verified_at).toLocaleDateString()}</span>
                      )}
                    </span>
                  ) : (
                    <button
                      onClick={() => setExpandedDns(expandedDns === env.id ? null : env.id)}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer"
                      style={{ background: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Unverified
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(env.id, env.name)}
                    disabled={deleting === env.id}
                    className="p-1 rounded hover:bg-red-500/10"
                    title="Delete environment"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={deleting === env.id ? 'var(--rm-text-muted)' : 'var(--rm-fail)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* URL + description */}
              <div className="text-[12px] font-mono mb-1" style={{ color: 'var(--rm-text-muted)' }}>
                {env.base_url}
              </div>
              {env.description && (
                <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
                  {env.description}
                </div>
              )}

              {/* DNS Verification Panel */}
              {expandedDns === env.id && !env.verified && env.verification_token && (
                <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                  <h4 className="text-[13px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>
                    DNS Verification
                  </h4>
                  <p className="text-[12px] mb-3" style={{ color: 'var(--rm-text-secondary)' }}>
                    Add a TXT record to your DNS to verify ownership of <strong>{extractDomain(env.base_url)}</strong>.
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] font-medium mt-0.5 flex-shrink-0 w-16" style={{ color: 'var(--rm-text-muted)' }}>Record</span>
                      <code
                        className="text-[12px] px-2 py-1 rounded flex-1"
                        style={{ background: 'var(--rm-bg-void)', color: 'var(--rm-signal)', wordBreak: 'break-all' }}
                      >
                        TXT _loadtoad-verify.{extractDomain(env.base_url)}
                      </code>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] font-medium mt-0.5 flex-shrink-0 w-16" style={{ color: 'var(--rm-text-muted)' }}>Value</span>
                      <code
                        className="text-[12px] px-2 py-1 rounded flex-1"
                        style={{ background: 'var(--rm-bg-void)', color: 'var(--rm-signal)', wordBreak: 'break-all' }}
                      >
                        {env.verification_token}
                      </code>
                    </div>
                  </div>

                  <p className="text-[11px] mb-3" style={{ color: 'var(--rm-text-muted)' }}>
                    DNS changes can take a few minutes to propagate. Click below when the record is in place.
                  </p>

                  <button
                    onClick={() => handleVerify(env.id)}
                    disabled={verifying === env.id}
                    className="btn btn-primary text-[13px]"
                  >
                    {verifying === env.id ? (
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                        Verifying...
                      </span>
                    ) : 'Verify Now'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
