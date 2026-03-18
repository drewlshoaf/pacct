'use client';

import SectionCard from '../SectionCard';

interface Props {
  owner: string;
  version: number;
  onOwnerChange: (v: string) => void;
}

export default function OwnershipSection({ owner, version, onOwnerChange }: Props) {
  return (
    <SectionCard title="Ownership">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Owner</label>
          <input
            type="text"
            value={owner}
            onChange={e => onOwnerChange(e.target.value)}
            placeholder="team-name or user@email.com"
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
        </div>
        <div className="w-24">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Version</label>
          <div
            className="text-[13px] px-3 py-2.5 rounded-lg"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}
          >
            v{version}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
