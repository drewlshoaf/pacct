'use client';

import { useState } from 'react';
import Link from 'next/link';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';

type Step = 1 | 2 | 3;

const GENERATED_TOKEN = 'sv-verify=lt_v1_a8f3e2c9d4b1';

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { num: 1, label: 'Environment Details' },
    { num: 2, label: 'DNS Verification' },
    { num: 3, label: 'Confirmation' },
  ];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold" style={{
              background: current > step.num ? 'var(--rm-pass)' : current === step.num ? 'var(--rm-signal)' : 'var(--rm-border)',
              color: current >= step.num ? '#fff' : 'var(--rm-text-muted)',
            }}>
              {current > step.num ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              ) : step.num}
            </div>
            <span className="text-[13px] font-medium" style={{ color: current >= step.num ? 'var(--rm-text)' : 'var(--rm-text-muted)' }}>{step.label}</span>
          </div>
          {i < steps.length - 1 && <div className="w-12 h-px mx-1" style={{ background: current > step.num ? 'var(--rm-pass)' : 'var(--rm-border)' }} />}
        </div>
      ))}
    </div>
  );
}

export default function AddEnvironmentPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 1: Details
  const [envName, setEnvName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [description, setDescription] = useState('');
  const [envType, setEnvType] = useState('staging');

  // Step 2: Verification
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'failed' | 'success'>('idle');

  // Derived
  const domain = (() => {
    try { return new URL(baseUrl).hostname; } catch { return 'your-domain.com'; }
  })();
  const txtRecord = `_sv-verification.${domain}`;
  const canProceedStep1 = envName.trim() && baseUrl.trim() && baseUrl.startsWith('http');

  const handleVerify = () => {
    setVerifyStatus('checking');
    // Simulate DNS check
    setTimeout(() => {
      setVerifyStatus('success');
    }, 2500);
  };

  return (
    <PortalLayout>
      <PageHeader
        title="Add Environment"
        description="Connect and verify a new environment"
        actions={<Link href="/dashboard/organization" className="btn btn-ghost text-[13px]">Cancel</Link>}
      />

      <div className="max-w-2xl">
        <StepIndicator current={step} />

        {/* Step 1: Environment Details */}
        {step === 1 && (
          <div className="card">
            <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Environment Details</h3>
            <p className="text-[12px] mb-6" style={{ color: 'var(--rm-text-muted)' }}>Tell us about the environment you want to connect.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Environment Name</label>
                <input
                  type="text" value={envName} onChange={e => setEnvName(e.target.value)} placeholder="e.g. staging, production, qa"
                  className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>A short name to identify this environment across Runtime Max.</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Base URL</label>
                <input
                  type="url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.staging.example.com"
                  className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none font-mono" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>The root URL that Runtime Max will target. Must include protocol (https://).</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Type</label>
                <div className="flex gap-3">
                  {['staging', 'production', 'qa', 'development'].map(type => (
                    <button key={type} onClick={() => setEnvType(type)} className="text-[13px] px-4 py-2 rounded-lg font-medium transition-colors capitalize" style={{
                      background: envType === type ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                      color: envType === type ? 'var(--rm-signal)' : 'var(--rm-text-secondary)',
                      border: `1px solid ${envType === type ? 'rgba(46,139,62,0.25)' : 'var(--rm-border)'}`,
                    }}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Description <span className="font-normal" style={{ color: 'var(--rm-text-muted)' }}>(optional)</span></label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this environment..."
                  rows={3} className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-none" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setStep(2)} disabled={!canProceedStep1} className="btn btn-primary text-[13px] disabled:opacity-40 disabled:cursor-not-allowed">
                Continue to Verification
              </button>
            </div>
          </div>
        )}

        {/* Step 2: DNS Verification */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="card">
              <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Verify Domain Ownership</h3>
              <p className="text-[12px] mb-6" style={{ color: 'var(--rm-text-muted)' }}>
                To confirm you own <span className="font-mono font-medium" style={{ color: 'var(--rm-text-secondary)' }}>{domain}</span>, add the following DNS TXT record. This is a one-time verification step.
              </p>

              {/* DNS Record Instructions */}
              <div className="px-4 py-4 rounded-lg mb-5" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--rm-text-muted)' }}>Add this TXT record to your DNS</div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--rm-text-muted)' }}>Record Type</div>
                    <div className="text-[14px] font-mono font-semibold" style={{ color: 'var(--rm-text)' }}>TXT</div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Host / Name</span>
                      <button onClick={() => navigator.clipboard.writeText(txtRecord)} className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors hover:bg-[#252A35]" style={{ color: 'var(--rm-signal)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        Copy
                      </button>
                    </div>
                    <div className="text-[13px] font-mono px-3 py-2 rounded" style={{ background: 'var(--rm-bg-void)', color: 'var(--rm-text)' }}>{txtRecord}</div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Value</span>
                      <button onClick={() => navigator.clipboard.writeText(GENERATED_TOKEN)} className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors hover:bg-[#252A35]" style={{ color: 'var(--rm-signal)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        Copy
                      </button>
                    </div>
                    <div className="text-[13px] font-mono px-3 py-2 rounded" style={{ background: 'var(--rm-bg-void)', color: 'var(--rm-text)' }}>{GENERATED_TOKEN}</div>
                  </div>

                  <div>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--rm-text-muted)' }}>TTL</div>
                    <div className="text-[13px] font-mono" style={{ color: 'var(--rm-text-secondary)' }}>300 (or your provider&apos;s default)</div>
                  </div>
                </div>
              </div>

              {/* Provider-specific help */}
              <div className="mb-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Common DNS Providers</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Cloudflare', path: 'DNS → Records → Add Record → TXT' },
                    { name: 'Route 53', path: 'Hosted Zones → Create Record → TXT' },
                    { name: 'Google DNS', path: 'Cloud DNS → Zone → Add Record Set → TXT' },
                    { name: 'GoDaddy', path: 'DNS Management → Add → TXT' },
                  ].map(provider => (
                    <div key={provider.name} className="px-3 py-2 rounded-lg" style={{ background: 'var(--rm-bg-raised)' }}>
                      <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text-secondary)' }}>{provider.name}</div>
                      <div className="text-[11px] font-mono" style={{ color: 'var(--rm-text-muted)' }}>{provider.path}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info callout */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-5" style={{ background: 'rgba(46,139,62,0.06)', border: '1px solid rgba(46,139,62,0.15)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <div>
                  <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>DNS propagation may take a few minutes</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>Most providers propagate within 1-5 minutes. In rare cases it can take up to an hour. You can safely leave this page and verify later from the Organization page.</div>
                </div>
              </div>

              {/* Verification status */}
              {verifyStatus === 'checking' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-5" style={{ background: 'rgba(46,139,62,0.06)', border: '1px solid rgba(46,139,62,0.15)' }}>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--rm-signal)', borderTopColor: 'transparent' }} />
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>Looking up DNS records...</div>
                    <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Querying TXT records for {txtRecord}</div>
                  </div>
                </div>
              )}

              {verifyStatus === 'failed' && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-5" style={{ background: 'rgba(211,93,93,0.06)', border: '1px solid rgba(211,93,93,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>TXT record not found</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>We couldn&apos;t find the verification record at <span className="font-mono">{txtRecord}</span>. Make sure the record is saved and try again in a few minutes.</div>
                  </div>
                </div>
              )}

              {verifyStatus === 'success' && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-5" style={{ background: 'rgba(59,167,118,0.06)', border: '1px solid rgba(59,167,118,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2.5" className="mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'var(--rm-pass)' }}>Domain verified successfully</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>TXT record confirmed for <span className="font-mono">{domain}</span>. You can now proceed.</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="btn btn-ghost text-[13px]">Back</button>
                <div className="flex gap-3">
                  {verifyStatus !== 'success' && (
                    <button onClick={handleVerify} disabled={verifyStatus === 'checking'} className="btn btn-primary text-[13px] disabled:opacity-60">
                      {verifyStatus === 'checking' ? 'Checking...' : verifyStatus === 'failed' ? 'Retry Verification' : 'Verify DNS Record'}
                    </button>
                  )}
                  {verifyStatus === 'success' && (
                    <button onClick={() => setStep(3)} className="btn btn-primary text-[13px]">Continue</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,167,118,0.12)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold" style={{ color: 'var(--rm-text)' }}>Environment Ready</h3>
                <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Domain verified and environment configured.</p>
              </div>
            </div>

            <div className="px-4 py-4 rounded-lg mb-5" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Name</span>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{envName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Type</span>
                  <span className="text-[12px] px-2 py-0.5 rounded capitalize" style={{ background: 'var(--rm-border)', color: 'var(--rm-text-secondary)' }}>{envType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Base URL</span>
                  <span className="text-[13px] font-mono" style={{ color: 'var(--rm-text-secondary)' }}>{baseUrl}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Domain</span>
                  <span className="text-[13px] font-mono" style={{ color: 'var(--rm-text-secondary)' }}>{domain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Ownership</span>
                  <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--rm-pass)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified
                  </span>
                </div>
                {description && (
                  <div className="pt-2" style={{ borderTop: '1px solid var(--rm-border)' }}>
                    <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Description</span>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--rm-text-secondary)' }}>{description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* What's next */}
            <div className="mb-6">
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>What&apos;s Next</div>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'var(--rm-bg-raised)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>1</span>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>Create scenarios</div>
                    <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Define the user journeys you want to test against this environment.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'var(--rm-bg-raised)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>2</span>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>Configure tests</div>
                    <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Attach load profiles to your scenarios — baseline, stress, spike, etc.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'var(--rm-bg-raised)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>3</span>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>Build a plan</div>
                    <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Group tests into plans and schedule them to run against this environment.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(2)} className="btn btn-ghost text-[13px]">Back</button>
              <div className="flex gap-3">
                <Link href="/dashboard/scenarios" className="btn btn-ghost text-[13px]">Create Scenario</Link>
                <Link href="/dashboard/organization" className="btn btn-primary text-[13px]">Done</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
