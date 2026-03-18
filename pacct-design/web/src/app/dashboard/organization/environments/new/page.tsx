'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { useToast } from '@/components/ui/Toast';
import SectionCard from '../../../scenarios/_components/SectionCard';
import ToggleButtonGroup from '../../../scenarios/_components/ToggleButtonGroup';
import { saveEnvironmentToServer } from '../../_store/environmentStore';

const TYPE_OPTIONS = [
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
  { value: 'qa', label: 'QA' },
  { value: 'development', label: 'Development' },
  { value: 'custom', label: 'Custom' },
];

export default function NewEnvironmentPage() {
  const [id] = useState(() => crypto.randomUUID());
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('staging');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Validation failed', description: 'Environment name is required.', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      await saveEnvironmentToServer({
        id,
        name: name.trim(),
        base_url: baseUrl.trim(),
        type,
        description: description.trim(),
        is_default: false,
        verified: false,
        verification_token: null,
        verified_at: null,
        created_at: now,
        updated_at: now,
      });

      toast({
        title: 'Environment created',
        description: `"${name.trim()}" has been saved.`,
        type: 'success',
      });
      router.push('/dashboard/organization');
    } catch {
      toast({ title: 'Save failed', description: 'Could not create environment. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout>
      <PageHeader
        title="New Environment"
        description="Add a target environment for your plans"
        actions={<Link href="/dashboard/organization" className="btn btn-ghost text-[13px]">Cancel</Link>}
      />

      <div className="max-w-3xl space-y-5">
        {/* Basic Info */}
        <SectionCard title="Basic Info" description="Name and describe this environment.">
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Staging API"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://staging-api.acme.io"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this environment used for?"
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors resize-y"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Type */}
        <SectionCard title="Type" description="Select the environment type.">
          <ToggleButtonGroup
            options={TYPE_OPTIONS}
            value={type}
            onChange={(val) => setType(val)}
          />
        </SectionCard>

        {/* Save bar */}
        <div
          className="sticky bottom-0 flex items-center justify-between py-4"
          style={{ background: 'linear-gradient(transparent, var(--rm-bg-void) 30%)' }}
        >
          <Link href="/dashboard/organization" className="btn btn-ghost text-[13px]">Cancel</Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Create Environment'}
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
