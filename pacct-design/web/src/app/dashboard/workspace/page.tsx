'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import AdminTabNav, { type AdminTab } from '@/components/admin/AdminTabNav';
import EnvironmentsView from '@/app/dashboard/infrastructure/_components/EnvironmentsView';
import RmSelect from '@/components/ui/RmSelect';
import {
  NOTIFICATION_EVENT_REGISTRY,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationEventType,
  type NotificationCategory,
  type NotificationSeverity,
  type WorkspaceNotificationRule,
  type NotificationLogEntry,
  type NotificationLogStatus,
} from '@loadtoad/schema';

type Tab = 'environments' | 'notifications' | 'integrations' | 'ai-analysis' | 'data';

const tabs: AdminTab[] = [
  { key: 'environments', label: 'Environments', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg> },
  { key: 'notifications', label: 'Notifications & Alerts', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
  { key: 'integrations', label: 'Integrations', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg> },
  { key: 'ai-analysis', label: 'AI Analysis', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
  { key: 'data', label: 'Data & Retention', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg> },
];

// ── Inline form components ──

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => { if (!disabled) onChange(!enabled); }} className="relative w-10 h-5 rounded-full transition-colors" style={{ background: enabled ? 'var(--rm-signal)' : 'var(--rm-border)', opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform bg-white" style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--rm-border)' }}>
      <div className="min-w-0 mr-4">
        <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{label}</div>
        {description && <div className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-[13px] px-3 py-1.5 rounded-lg border-none outline-none w-48" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }} />
  );
}

function NumberInput({ value, onChange, unit, min, max }: { value: number; onChange: (v: number) => void; unit?: string; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} className="text-[13px] px-3 py-1.5 rounded-lg border-none outline-none w-24 text-right" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }} />
      {unit && <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>{unit}</span>}
    </div>
  );
}

function SliderInput({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; unit?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} className="w-32 accent-[#2E8B3E]" />
      <span className="text-[13px] font-medium w-12 text-right" style={{ color: 'var(--rm-text)' }}>{value}{unit}</span>
    </div>
  );
}

function IntegrationCard({ name, description, icon, connected, onToggle }: { name: string; description: string; icon: React.ReactNode; connected: boolean; onToggle: () => void }) {
  return (
    <div className="px-4 py-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--rm-bg-raised)', border: `1px solid ${connected ? 'rgba(59,167,118,0.25)' : 'var(--rm-border)'}` }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--rm-border)', color: 'var(--rm-text-secondary)' }}>{icon}</div>
        <div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{name}</div>
          <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>{description}</div>
        </div>
      </div>
      <button onClick={onToggle} className="text-[12px] px-3 py-1.5 rounded-lg font-medium transition-colors" style={{ background: connected ? 'rgba(59,167,118,0.12)' : 'var(--rm-signal-glow)', color: connected ? 'var(--rm-pass)' : 'var(--rm-signal)' }}>
        {connected ? 'Connected' : 'Connect'}
      </button>
    </div>
  );
}

// ── Settings persistence ──

const STORAGE_KEY = 'loadtoad:workspace-settings';

interface WorkspaceSettings {
  slackConnected: boolean; githubConnected: boolean; datadogConnected: boolean;
  pagerdutyConnected: boolean; jenkinsConnected: boolean; grafanaConnected: boolean;
  teamsConnected: boolean; webhooksEnabled: boolean; webhookUrl: string;
  autoAnalysis: boolean; confidenceThreshold: number; riskSensitivity: string;
  includeRecommendations: boolean; includeDecisionSpine: boolean; maxRecommendations: number;
  retentionDays: number; metricResolution: string; exportFormat: string;
  autoArchive: boolean; archiveAfter: number;
}

const DEFAULTS: WorkspaceSettings = {
  slackConnected: true, githubConnected: true, datadogConnected: false,
  pagerdutyConnected: false, jenkinsConnected: false, grafanaConnected: false,
  teamsConnected: false, webhooksEnabled: true, webhookUrl: 'https://hooks.example.com/runtimemax',
  autoAnalysis: true, confidenceThreshold: 70, riskSensitivity: 'balanced',
  includeRecommendations: true, includeDecisionSpine: true, maxRecommendations: 5,
  retentionDays: 90, metricResolution: '10s', exportFormat: 'json',
  autoArchive: true, archiveAfter: 30,
};

function loadSettings(): WorkspaceSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: WorkspaceSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ── Main Page ──

const VALID_TABS: Tab[] = ['environments', 'notifications', 'integrations', 'ai-analysis', 'data'];

export default function WorkspacePage() {
  return (
    <Suspense fallback={<PortalLayout><PageHeader title="Workspace" description="Workspace-level configuration and policies" /><div className="text-center py-12" style={{ color: 'var(--rm-text-muted)' }}>Loading...</div></PortalLayout>}>
      <WorkspacePageInner />
    </Suspense>
  );
}

function WorkspacePageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab && VALID_TABS.includes(initialTab) ? initialTab : 'environments');
  const [saved, setSaved] = useState(false);

  // Load persisted settings on mount
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULTS);
  useEffect(() => { setSettings(loadSettings()); }, []);

  // ── Notification rules (DB-backed) ──
  type RuleMap = Record<NotificationEventType, {
    enabled: boolean; email: boolean; sms: boolean; slack: boolean;
    severity_filter: NotificationSeverity; cooldown_seconds: number; grouping_window_seconds: number;
  }>;

  const [rules, setRules] = useState<RuleMap>(() =>
    Object.fromEntries(
      NOTIFICATION_EVENT_REGISTRY.map(e => [e.event_type, {
        enabled: e.default_enabled,
        email: e.default_channels.includes('email'),
        sms: e.default_channels.includes('sms'),
        slack: e.default_channels.includes('slack'),
        severity_filter: e.default_severity,
        cooldown_seconds: 300,
        grouping_window_seconds: 60,
      }]),
    ) as RuleMap,
  );
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesSaved, setRulesSaved] = useState(false);

  // ── Notification log ──
  const [logEntries, setLogEntries] = useState<NotificationLogEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logOffset, setLogOffset] = useState(0);
  const [logEventFilter, setLogEventFilter] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('');
  const LOG_PAGE_SIZE = 25;

  // Fetch rules from API
  useEffect(() => {
    fetch('/api/notifications/rules?orgId=default')
      .then(r => r.ok ? r.json() : [])
      .then((data: WorkspaceNotificationRule[]) => {
        if (data.length > 0) {
          const map = { ...rules };
          for (const r of data) {
            map[r.event_type] = {
              enabled: r.enabled,
              email: r.email,
              sms: r.sms,
              slack: r.slack,
              severity_filter: r.severity_filter,
              cooldown_seconds: r.cooldown_seconds,
              grouping_window_seconds: r.grouping_window_seconds,
            };
          }
          setRules(map);
        }
        setRulesLoaded(true);
      })
      .catch(() => setRulesLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch notification log
  const fetchLog = useCallback(() => {
    const params = new URLSearchParams({ orgId: 'default', limit: String(LOG_PAGE_SIZE), offset: String(logOffset) });
    if (logEventFilter) params.set('eventType', logEventFilter);
    if (logStatusFilter) params.set('status', logStatusFilter);
    fetch(`/api/notifications/log?${params}`)
      .then(r => r.ok ? r.json() : { entries: [], total: 0 })
      .then((data: { entries: NotificationLogEntry[]; total: number }) => {
        setLogEntries(data.entries);
        setLogTotal(data.total);
      })
      .catch(() => { /* silently fail */ });
  }, [logOffset, logEventFilter, logStatusFilter]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const updateRule = (eventType: NotificationEventType, patch: Partial<RuleMap[NotificationEventType]>) => {
    setRules(prev => ({ ...prev, [eventType]: { ...prev[eventType], ...patch } }));
    setRulesSaved(false);
  };

  const handleSaveRules = async () => {
    setRulesSaving(true);
    try {
      const rulesArr = Object.entries(rules).map(([event_type, r]) => ({
        event_type: event_type as NotificationEventType,
        ...r,
        enabled: r.email || r.sms || r.slack,
      }));
      await fetch('/api/notifications/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'default', rules: rulesArr }),
      });
      setRulesSaved(true);
      setTimeout(() => setRulesSaved(false), 2000);
    } catch { /* ignore */ }
    setRulesSaving(false);
  };

  // Group events by category for the routing table
  const NOTIF_CATEGORY_ORDER: NotificationCategory[] = ['run_lifecycle', 'gate_events', 'performance', 'intelligence', 'billing'];
  const groupedRuleEvents = NOTIF_CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: NOTIFICATION_CATEGORY_LABELS[cat],
    events: NOTIFICATION_EVENT_REGISTRY.filter(e => e.category === cat),
  })).filter(g => g.events.length > 0);

  const SEVERITY_COLORS: Record<NotificationSeverity, string> = {
    informational: 'var(--rm-text-muted)',
    medium: 'var(--rm-caution)',
    high: 'var(--rm-signal)',
    critical: 'var(--rm-fail)',
  };

  // Convenience setter factory
  const set = useCallback(<K extends keyof WorkspaceSettings>(key: K) => (val: WorkspaceSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULTS });
    saveSettings(DEFAULTS);
  };

  // Destructure for convenience in the render
  const {
    slackConnected, githubConnected, datadogConnected, pagerdutyConnected,
    jenkinsConnected, grafanaConnected, teamsConnected, webhooksEnabled, webhookUrl,
    autoAnalysis, confidenceThreshold, riskSensitivity,
    includeRecommendations, includeDecisionSpine, maxRecommendations,
    retentionDays, metricResolution, exportFormat, autoArchive, archiveAfter,
  } = settings;

  return (
    <PortalLayout>
      <PageHeader title="Workspace" description="Workspace-level configuration and policies" />

      <div className="flex gap-6">
        <AdminTabNav tabs={tabs} activeTab={activeTab} onTabChange={key => setActiveTab(key as Tab)} />

        <div className="flex-1 min-w-0">

          {/* Environments */}
          {activeTab === 'environments' && (
            <EnvironmentsView />
          )}

          {/* Notifications & Alerts */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              {/* Card 1: Workspace Notification Routing */}
              <div className="card">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[16px] font-semibold" style={{ color: 'var(--rm-text)' }}>Notification Routing</h3>
                  <button
                    onClick={handleSaveRules}
                    disabled={rulesSaving}
                    className="btn btn-primary text-[12px] px-3 py-1.5"
                  >
                    {rulesSaved ? 'Saved!' : rulesSaving ? 'Saving...' : 'Save Rules'}
                  </button>
                </div>
                <p className="text-[12px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>Configure which events trigger notifications and through which channels</p>

                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--rm-border)' }}>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 pr-3" style={{ color: 'var(--rm-text-muted)' }}>Event</th>
                        <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-2 w-24" style={{ color: 'var(--rm-text-muted)' }}>Severity</th>
                        <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-2 w-16" style={{ color: 'var(--rm-text-muted)' }}>Email</th>
                        <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-2 w-16" style={{ color: 'var(--rm-text-muted)' }}>SMS</th>
                        <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-2 w-16" style={{ color: 'var(--rm-text-muted)' }}>Slack</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedRuleEvents.map(group => (
                        <React.Fragment key={group.category}>
                          <tr>
                            <td colSpan={5} className="pt-3 pb-1 px-0">
                              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-signal)' }}>{group.label}</div>
                            </td>
                          </tr>
                          {group.events.map(evt => {
                            const rule = rules[evt.event_type];
                            return (
                              <tr key={evt.event_type} style={{ borderBottom: '1px solid var(--rm-border)' }}>
                                <td className="py-2 pr-3">
                                  <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{evt.label}</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{evt.description}</div>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${SEVERITY_COLORS[rule?.severity_filter ?? evt.default_severity]}15`, color: SEVERITY_COLORS[rule?.severity_filter ?? evt.default_severity] }}>
                                    {rule?.severity_filter ?? evt.default_severity}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <div className="flex justify-center">
                                    <Toggle enabled={rule?.email ?? false} onChange={v => updateRule(evt.event_type, { email: v })} />
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <div className="flex justify-center">
                                    <Toggle enabled={rule?.sms ?? false} onChange={v => updateRule(evt.event_type, { sms: v })} />
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <div className="flex justify-center">
                                    <Toggle enabled={rule?.slack ?? false} onChange={v => updateRule(evt.event_type, { slack: v })} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 2: Anti-Noise Settings */}
              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Anti-Noise Settings</h3>
                <p className="text-[12px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>Control notification frequency to prevent alert fatigue</p>

                {(() => {
                  const enabledEvents = NOTIFICATION_EVENT_REGISTRY.filter(e => {
                    const r = rules[e.event_type];
                    return r && (r.email || r.sms || r.slack);
                  });
                  if (enabledEvents.length === 0) {
                    return (
                      <div className="text-center py-6 text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
                        No channels enabled. Enable a channel in the routing table above to configure anti-noise settings.
                      </div>
                    );
                  }
                  return (
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--rm-border)' }}>
                          <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 pr-4" style={{ color: 'var(--rm-text-muted)' }}>Event</th>
                          <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-3 w-40" style={{ color: 'var(--rm-text-muted)' }}>Cooldown (sec)</th>
                          <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 pl-3 w-44" style={{ color: 'var(--rm-text-muted)' }}>Grouping Window (sec)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enabledEvents.map(evt => {
                          const rule = rules[evt.event_type];
                          return (
                            <tr key={evt.event_type} style={{ borderBottom: '1px solid var(--rm-border)' }}>
                              <td className="py-2.5 pr-4">
                                <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{evt.label}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex justify-center">
                                  <NumberInput value={rule?.cooldown_seconds ?? 300} onChange={v => updateRule(evt.event_type, { cooldown_seconds: v })} min={0} max={86400} />
                                </div>
                              </td>
                              <td className="py-2.5 pl-3 text-center">
                                <div className="flex justify-center">
                                  <NumberInput value={rule?.grouping_window_seconds ?? 60} onChange={v => updateRule(evt.event_type, { grouping_window_seconds: v })} min={0} max={3600} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Card 3: Notification Log */}
              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Notification Log</h3>
                <p className="text-[12px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>Recent notification activity across all channels</p>

                <div className="flex items-center gap-3 mb-4">
                  <RmSelect
                    value={logEventFilter}
                    onChange={v => { setLogEventFilter(v); setLogOffset(0); }}
                    options={[
                      { value: '', label: 'All Events' },
                      ...NOTIFICATION_EVENT_REGISTRY.map(e => ({ value: e.event_type, label: e.label })),
                    ]}
                    className="w-48"
                  />
                  <RmSelect
                    value={logStatusFilter}
                    onChange={v => { setLogStatusFilter(v); setLogOffset(0); }}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'sent', label: 'Sent' },
                      { value: 'delivered', label: 'Delivered' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'failed', label: 'Failed' },
                      { value: 'suppressed', label: 'Suppressed' },
                    ]}
                    className="w-40"
                  />
                </div>

                {logEntries.length === 0 ? (
                  <div className="text-center py-8 text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
                    No notifications yet. Notification activity will appear here as events are triggered.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--rm-border)' }}>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 pr-3" style={{ color: 'var(--rm-text-muted)' }}>Time</th>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 px-3" style={{ color: 'var(--rm-text-muted)' }}>Event</th>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 px-3" style={{ color: 'var(--rm-text-muted)' }}>Channel</th>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 px-3" style={{ color: 'var(--rm-text-muted)' }}>Recipient</th>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 px-3" style={{ color: 'var(--rm-text-muted)' }}>Status</th>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 pl-3" style={{ color: 'var(--rm-text-muted)' }}>Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logEntries.map(entry => {
                            const statusColor: Record<NotificationLogStatus, string> = {
                              sent: 'var(--rm-pass)', delivered: 'var(--rm-pass)',
                              pending: 'var(--rm-text-muted)', failed: 'var(--rm-fail)', suppressed: 'var(--rm-caution)',
                            };
                            const eventMeta = NOTIFICATION_EVENT_REGISTRY.find(e => e.event_type === entry.event_type);
                            const timeAgo = getTimeAgo(entry.created_at);
                            return (
                              <tr key={entry.id} style={{ borderBottom: '1px solid var(--rm-border)' }}>
                                <td className="py-2 pr-3 text-[12px] whitespace-nowrap" style={{ color: 'var(--rm-text-muted)' }}>{timeAgo}</td>
                                <td className="py-2 px-3">
                                  <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>{eventMeta?.label ?? entry.event_type}</div>
                                </td>
                                <td className="py-2 px-3 text-[12px] capitalize" style={{ color: 'var(--rm-text-secondary)' }}>{entry.channel}</td>
                                <td className="py-2 px-3 text-[12px] font-mono truncate max-w-[160px]" style={{ color: 'var(--rm-text-secondary)' }}>{entry.recipient}</td>
                                <td className="py-2 px-3">
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: `${statusColor[entry.status]}15`, color: statusColor[entry.status] }}>
                                    {entry.status}
                                  </span>
                                </td>
                                <td className="py-2 pl-3 text-[12px] truncate max-w-[160px]" style={{ color: 'var(--rm-text-muted)' }}>{entry.reference_label || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--rm-border)' }}>
                      <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
                        Showing {logOffset + 1}–{Math.min(logOffset + LOG_PAGE_SIZE, logTotal)} of {logTotal}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLogOffset(Math.max(0, logOffset - LOG_PAGE_SIZE))}
                          disabled={logOffset === 0}
                          className="text-[12px] px-3 py-1 rounded-lg"
                          style={{ background: 'var(--rm-bg-raised)', color: logOffset === 0 ? 'var(--rm-text-muted)' : 'var(--rm-text-secondary)', cursor: logOffset === 0 ? 'not-allowed' : 'pointer' }}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setLogOffset(logOffset + LOG_PAGE_SIZE)}
                          disabled={logOffset + LOG_PAGE_SIZE >= logTotal}
                          className="text-[12px] px-3 py-1 rounded-lg"
                          style={{ background: 'var(--rm-bg-raised)', color: logOffset + LOG_PAGE_SIZE >= logTotal ? 'var(--rm-text-muted)' : 'var(--rm-text-secondary)', cursor: logOffset + LOG_PAGE_SIZE >= logTotal ? 'not-allowed' : 'pointer' }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>CI/CD</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Connect your build and deploy pipelines</p>
                <div className="space-y-3">
                  <IntegrationCard name="GitHub Actions" description="Trigger runs from GitHub workflows" connected={githubConnected} onToggle={() => set('githubConnected')(!githubConnected)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>} />
                  <IntegrationCard name="Jenkins" description="Run tests as Jenkins pipeline steps" connected={jenkinsConnected} onToggle={() => set('jenkinsConnected')(!jenkinsConnected)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>} />
                </div>
              </div>

              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Messaging</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Send alerts and reports to your team channels</p>
                <div className="space-y-3">
                  <IntegrationCard name="Slack" description="Post results and alerts to Slack channels" connected={slackConnected} onToggle={() => set('slackConnected')(!slackConnected)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" /><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>} />
                  <IntegrationCard name="PagerDuty" description="Escalate critical failures to on-call" connected={pagerdutyConnected} onToggle={() => set('pagerdutyConnected')(!pagerdutyConnected)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>} />
                  <IntegrationCard name="Microsoft Teams" description="Post results to Teams channels" connected={teamsConnected} onToggle={() => set('teamsConnected')(!teamsConnected)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} />
                </div>
              </div>

              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Observability</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Connect your monitoring and observability stack</p>
                <div className="space-y-3">
                  <IntegrationCard name="Datadog" description="Export metrics and traces to Datadog" connected={datadogConnected} onToggle={() => set('datadogConnected')(!datadogConnected)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>} />
                  <IntegrationCard name="Grafana" description="Send dashboards and annotations" connected={grafanaConnected} onToggle={() => set('grafanaConnected')(!grafanaConnected)} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>} />
                </div>
              </div>

              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Webhooks</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Send run results to custom endpoints</p>
                <SettingRow label="Enable Webhooks" description="POST run results to your webhook URL on completion">
                  <Toggle enabled={webhooksEnabled} onChange={set('webhooksEnabled')} />
                </SettingRow>
                {webhooksEnabled && (
                  <SettingRow label="Webhook URL" description="Endpoint that receives POST payloads">
                    <TextInput value={webhookUrl} onChange={set('webhookUrl')} placeholder="https://..." />
                  </SettingRow>
                )}
              </div>
            </div>
          )}

          {/* AI Analysis (was AI Configuration) */}
          {activeTab === 'ai-analysis' && (
            <div className="space-y-5">
              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>AI Analysis Settings</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Configure how AI analyzes your test runs</p>
                <SettingRow label="Auto-Analysis" description="Automatically analyze runs when they complete">
                  <Toggle enabled={autoAnalysis} onChange={set('autoAnalysis')} />
                </SettingRow>
                <SettingRow label="Confidence Threshold" description="Minimum confidence score to surface recommendations">
                  <SliderInput value={confidenceThreshold} onChange={set('confidenceThreshold')} min={0} max={100} unit="%" />
                </SettingRow>
                <SettingRow label="Risk Sensitivity" description="How aggressively to flag potential issues">
                  <RmSelect
                    value={riskSensitivity}
                    onChange={v => set('riskSensitivity')(v)}
                    options={[
                      { value: 'conservative', label: 'Conservative' },
                      { value: 'balanced', label: 'Balanced' },
                      { value: 'aggressive', label: 'Aggressive' },
                    ]}
                    className="w-48"
                  />
                </SettingRow>
                <SettingRow label="Max Recommendations" description="Maximum number of recommendations per run">
                  <NumberInput value={maxRecommendations} onChange={set('maxRecommendations')} min={1} max={20} />
                </SettingRow>
              </div>

              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Output Options</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Control what the AI includes in analysis reports</p>
                <SettingRow label="Recommendations" description="Include actionable recommendations in analysis">
                  <Toggle enabled={includeRecommendations} onChange={set('includeRecommendations')} />
                </SettingRow>
                <SettingRow label="Decision Spine" description="Include evidence-based decision reasoning">
                  <Toggle enabled={includeDecisionSpine} onChange={set('includeDecisionSpine')} />
                </SettingRow>
              </div>
            </div>
          )}

          {/* Data & Retention */}
          {activeTab === 'data' && (
            <div className="space-y-5">
              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Data Retention</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>How long to keep run data and metrics</p>
                <SettingRow label="Retention Period" description="Days to retain full-resolution metric data">
                  <NumberInput value={retentionDays} onChange={set('retentionDays')} unit="days" min={7} max={365} />
                </SettingRow>
                <SettingRow label="Auto-Archive" description="Automatically archive runs after a period">
                  <Toggle enabled={autoArchive} onChange={set('autoArchive')} />
                </SettingRow>
                {autoArchive && (
                  <SettingRow label="Archive After" description="Days before runs are moved to archive">
                    <NumberInput value={archiveAfter} onChange={set('archiveAfter')} unit="days" min={1} max={365} />
                  </SettingRow>
                )}
              </div>

              <div className="card">
                <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Collection & Export</h3>
                <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Metric resolution and export preferences</p>
                <SettingRow label="Metric Resolution" description="Collection interval for time-series data">
                  <RmSelect
                    value={metricResolution}
                    onChange={v => set('metricResolution')(v)}
                    options={[
                      { value: '1s', label: '1 second' },
                      { value: '5s', label: '5 seconds' },
                      { value: '10s', label: '10 seconds' },
                      { value: '30s', label: '30 seconds' },
                      { value: '60s', label: '1 minute' },
                    ]}
                    className="w-48"
                  />
                </SettingRow>
                <SettingRow label="Export Format" description="Default format for data exports">
                  <RmSelect
                    value={exportFormat}
                    onChange={v => set('exportFormat')(v)}
                    options={[
                      { value: 'json', label: 'JSON' },
                      { value: 'csv', label: 'CSV' },
                      { value: 'parquet', label: 'Parquet' },
                    ]}
                    className="w-48"
                  />
                </SettingRow>
              </div>

              <div className="card">
                <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--rm-text)' }}>Storage Usage</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>Metrics Data</span>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>2.4 GB</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--rm-border)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: '24%', background: 'var(--rm-signal)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>Analysis</span>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>180 MB</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--rm-border)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: '8%', background: 'var(--rm-pass)' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>Event Logs</span>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>420 MB</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--rm-border)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: '12%', background: 'var(--rm-caution)' }} />
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--rm-border)' }}>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Total</span>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>3.0 GB / 10 GB</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button (for non-environments/non-notifications tabs) */}
          {activeTab !== 'environments' && activeTab !== 'notifications' && (
          <div className="flex items-center justify-end gap-3 mt-5">
            <button className="btn btn-ghost text-[13px]" onClick={handleReset}>Reset to Defaults</button>
            <button className="btn btn-primary text-[13px]" onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
