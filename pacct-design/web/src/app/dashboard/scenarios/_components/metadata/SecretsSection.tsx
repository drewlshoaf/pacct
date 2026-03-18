'use client';

import SectionCard from '../SectionCard';
import DynamicListEditor from '../DynamicListEditor';
import type { SecretRef } from '../../types';
import { create_default_secret_ref } from '../../types';

interface Props {
  secrets: SecretRef[];
  onChange: (secrets: SecretRef[]) => void;
}

export default function SecretsSection({ secrets, onChange }: Props) {
  return (
    <SectionCard title="Secrets" description="Secret references resolved at runtime. Never stored in plain text.">
      <DynamicListEditor
        items={secrets}
        onChange={onChange}
        createDefault={create_default_secret_ref}
        addLabel="Add Secret"
        emptyMessage="No secrets configured."
        renderItem={(item, _index, update) => (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Secret name (e.g. API_KEY)"
              className="flex-1 text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <input
              type="text"
              value={item.reference}
              onChange={e => update('reference', e.target.value)}
              placeholder="Reference (e.g. vault://secrets/api-key)"
              className="flex-1 text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          </div>
        )}
      />
    </SectionCard>
  );
}
