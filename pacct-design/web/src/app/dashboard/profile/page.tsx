'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import AdminTabNav, { type AdminTab } from '@/components/admin/AdminTabNav';
import RmSelect from '@/components/ui/RmSelect';
import {
  NOTIFICATION_EVENT_REGISTRY,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationEventType,
  type NotificationCategory,
} from '@loadtoad/schema';

const PROFILE_KEY = 'rm-operator-profile';
const NOTIF_KEY = 'rm-operator-notifications-v2';
const PREFS_KEY = 'rm-operator-preferences';

interface OperatorProfile {
  name: string;
  email: string;
  phone: string;
  initials: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

type NotifPrefEntry = { enabled: boolean; email: boolean; sms: boolean; slack: boolean };
type NotifPrefs = Record<NotificationEventType, NotifPrefEntry>;

// Build defaults from the registry (exclude admin_only events for personal prefs)
const PROFILE_EVENTS = NOTIFICATION_EVENT_REGISTRY.filter(e => !e.admin_only);
const DEFAULT_NOTIF_PREFS: NotifPrefs = Object.fromEntries(
  NOTIFICATION_EVENT_REGISTRY.map(e => [
    e.event_type,
    {
      enabled: e.default_enabled,
      email: e.default_channels.includes('email'),
      sms: e.default_channels.includes('sms'),
      slack: e.default_channels.includes('slack'),
    },
  ]),
) as NotifPrefs;

// Group events by category for UI rendering
const CATEGORY_ORDER: NotificationCategory[] = ['run_lifecycle', 'gate_events', 'performance', 'intelligence'];
const GROUPED_EVENTS = CATEGORY_ORDER.map(cat => ({
  category: cat,
  label: NOTIFICATION_CATEGORY_LABELS[cat],
  events: PROFILE_EVENTS.filter(e => e.category === cat),
})).filter(g => g.events.length > 0);

interface UserPreferences {
  timezone: string;
  dateFormat: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'OP';
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => { if (!disabled) onChange(!enabled); }}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ background: enabled ? 'var(--rm-signal)' : 'var(--rm-border)', opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform bg-white" style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  );
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

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-[13px] px-3 py-1.5 rounded-lg border-none outline-none w-56" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }} />
  );
}

const TABS: AdminTab[] = [
  { key: 'profile', label: 'Profile', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  { key: 'preferences', label: 'Preferences', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
  { key: 'notifications', label: 'Notifications', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'MMM d, yyyy', label: 'Jan 1, 2025' },
  { value: 'dd/MM/yyyy', label: '01/01/2025' },
  { value: 'MM/dd/yyyy', label: '01/01/2025 (US)' },
  { value: 'yyyy-MM-dd', label: '2025-01-01 (ISO)' },
];

export default function ProfilePage() {
  return (
    <Suspense fallback={<PortalLayout><PageHeader title="Profile" description="Your personal settings" /><div className="text-center py-12" style={{ color: 'var(--rm-text-muted)' }}>Loading...</div></PortalLayout>}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [profile, setProfile] = useState<OperatorProfile>({ name: 'Operator', email: '', phone: '', initials: 'OP', emailVerified: false, phoneVerified: false });
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [prefs, setPrefs] = useState<UserPreferences>({ timezone: 'America/New_York', dateFormat: 'MMM d, yyyy' });
  const [loaded, setLoaded] = useState(false);
  const [verifyingSms, setVerifyingSms] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem(PROFILE_KEY); if (s) setProfile(JSON.parse(s)); } catch { /* ignore */ }
    try {
      const s = localStorage.getItem(NOTIF_KEY);
      if (s) {
        const saved = JSON.parse(s) as Partial<NotifPrefs>;
        setNotifs(prev => {
          const merged = { ...prev };
          for (const key of Object.keys(saved) as NotificationEventType[]) {
            if (merged[key]) merged[key] = { ...merged[key], ...saved[key] };
          }
          return merged;
        });
      }
    } catch { /* ignore */ }
    try { const s = localStorage.getItem(PREFS_KEY); if (s) setPrefs(JSON.parse(s)); } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const updateProfile = (patch: Partial<OperatorProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...patch };
      if (patch.name !== undefined) next.initials = getInitials(patch.name || 'Operator');
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateNotifEntry = (eventType: NotificationEventType, patch: Partial<NotifPrefEntry>) => {
    setNotifs(prev => {
      const next = { ...prev, [eventType]: { ...prev[eventType], ...patch } };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updatePrefs = (patch: Partial<UserPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sendEmailVerification = () => {
    if (!profile.email) return;
    setVerifyingEmail(true);
    setTimeout(() => {
      updateProfile({ emailVerified: true });
      setVerifyingEmail(false);
    }, 1500);
  };

  const sendSmsVerification = () => {
    if (!profile.phone) return;
    setVerifyingSms(true);
    setTimeout(() => {
      updateProfile({ phoneVerified: true });
      setVerifyingSms(false);
    }, 1500);
  };

  const updateEmail = (v: string) => {
    updateProfile({ email: v, emailVerified: false });
  };
  const updatePhone = (v: string) => {
    updateProfile({ phone: v, phoneVerified: false });
  };

  if (!loaded) {
    return (
      <PortalLayout>
        <PageHeader title="Profile" description="Your personal settings" />
        <div className="text-center py-12" style={{ color: 'var(--rm-text-muted)' }}>Loading...</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <PageHeader title="Profile" description="Your personal settings" />

      <div className="flex gap-8">
        <AdminTabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 min-w-0 max-w-2xl">
          {/* ── Profile Tab ─────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="card">
              <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Identity</h3>
              <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Your name and contact details</p>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid var(--rm-border)' }}>
                <div className="relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}>{profile.initials}</div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text-muted)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  </button>
                </div>
                <div>
                  <div className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>{profile.name || 'Operator'}</div>
                  <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>{profile.email || 'No email set'}</div>
                </div>
              </div>

              <SettingRow label="Display Name" description="How your name appears across the platform">
                <TextInput value={profile.name} onChange={v => updateProfile({ name: v })} placeholder="Your name" />
              </SettingRow>
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--rm-border)' }}>
                <div className="min-w-0 mr-4">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>Email</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>Used for email notifications and account recovery</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <TextInput value={profile.email} onChange={updateEmail} placeholder="you@company.com" type="email" />
                  {profile.email && (
                    profile.emailVerified ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--rm-pass)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        Verified
                      </span>
                    ) : (
                      <button onClick={sendEmailVerification} disabled={verifyingEmail} className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors whitespace-nowrap" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)', cursor: verifyingEmail ? 'wait' : 'pointer' }}>
                        {verifyingEmail ? 'Sending...' : 'Verify'}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--rm-border)' }}>
                <div className="min-w-0 mr-4">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>Phone</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>Used for SMS alerts on critical events</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <TextInput value={profile.phone} onChange={updatePhone} placeholder="+1 (555) 000-0000" type="tel" />
                  {profile.phone && (
                    profile.phoneVerified ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--rm-pass)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        Verified
                      </span>
                    ) : (
                      <button onClick={sendSmsVerification} disabled={verifyingSms} className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors whitespace-nowrap" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)', cursor: verifyingSms ? 'wait' : 'pointer' }}>
                        {verifyingSms ? 'Sending...' : 'Verify'}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Preferences Tab ─────────────────────────────────────── */}
          {activeTab === 'preferences' && (
            <div className="card">
              <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Preferences</h3>
              <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Display and formatting preferences</p>

              <SettingRow label="Timezone" description="Used for displaying dates and scheduling">
                <RmSelect
                  value={prefs.timezone}
                  onChange={v => updatePrefs({ timezone: v })}
                  options={TIMEZONE_OPTIONS}
                  searchable
                  className="w-56"
                />
              </SettingRow>
              <SettingRow label="Date Format" description="How dates are displayed across the platform">
                <RmSelect
                  value={prefs.dateFormat}
                  onChange={v => updatePrefs({ dateFormat: v })}
                  options={DATE_FORMAT_OPTIONS}
                  className="w-56"
                />
              </SettingRow>
            </div>
          )}

          {/* ── Notifications Tab ───────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Notification Preferences</h3>
              <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>Choose how and when you want to be notified for each event type</p>

              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--rm-border)' }}>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider py-2 pr-4" style={{ color: 'var(--rm-text-muted)' }}>Event</th>
                    <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-3 w-20" style={{ color: 'var(--rm-text-muted)' }}>
                      <div>Email</div>
                      {!profile.email ? (
                        <div className="text-[10px] font-normal normal-case tracking-normal mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>No email set</div>
                      ) : !profile.emailVerified ? (
                        <button onClick={sendEmailVerification} disabled={verifyingEmail} className="text-[10px] font-normal normal-case tracking-normal mt-0.5" style={{ color: 'var(--rm-caution)', cursor: verifyingEmail ? 'wait' : 'pointer' }}>
                          {verifyingEmail ? 'Sending...' : 'Verify'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-[10px] font-normal normal-case tracking-normal mt-0.5" style={{ color: 'var(--rm-pass)' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          Verified
                        </div>
                      )}
                    </th>
                    <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-3 w-20" style={{ color: 'var(--rm-text-muted)' }}>
                      <div>SMS</div>
                      {!profile.phone ? (
                        <div className="text-[10px] font-normal normal-case tracking-normal mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>No phone set</div>
                      ) : !profile.phoneVerified ? (
                        <button onClick={sendSmsVerification} disabled={verifyingSms} className="text-[10px] font-normal normal-case tracking-normal mt-0.5" style={{ color: 'var(--rm-caution)', cursor: verifyingSms ? 'wait' : 'pointer' }}>
                          {verifyingSms ? 'Sending...' : 'Verify'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-[10px] font-normal normal-case tracking-normal mt-0.5" style={{ color: 'var(--rm-pass)' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          Verified
                        </div>
                      )}
                    </th>
                    <th className="text-center text-[11px] font-semibold uppercase tracking-wider py-2 pl-3 w-20" style={{ color: 'var(--rm-text-muted)' }}>Slack</th>
                  </tr>
                </thead>
                <tbody>
                  {GROUPED_EVENTS.map(group => (
                    <React.Fragment key={group.category}>
                      {/* Category header row */}
                      <tr>
                        <td colSpan={4} className="pt-4 pb-1.5 px-0">
                          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-signal)' }}>{group.label}</div>
                        </td>
                      </tr>
                      {group.events.map(evt => {
                        const pref = notifs[evt.event_type] ?? { enabled: false, email: false, sms: false, slack: false };
                        const emailDisabled = !profile.email || !profile.emailVerified;
                        const smsDisabled = !profile.phone || !profile.phoneVerified;
                        return (
                          <tr key={evt.event_type} style={{ borderBottom: '1px solid var(--rm-border)' }}>
                            <td className="py-2.5 pr-4">
                              <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{evt.label}</div>
                              <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{evt.description}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex justify-center">
                                <Toggle enabled={pref.email} onChange={v => updateNotifEntry(evt.event_type, { email: v })} disabled={emailDisabled} />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex justify-center">
                                <Toggle enabled={pref.sms} onChange={v => updateNotifEntry(evt.event_type, { sms: v })} disabled={smsDisabled} />
                              </div>
                            </td>
                            <td className="py-2.5 pl-3 text-center">
                              <div className="flex justify-center">
                                <Toggle enabled={pref.slack} onChange={v => updateNotifEntry(evt.event_type, { slack: v })} />
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
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
