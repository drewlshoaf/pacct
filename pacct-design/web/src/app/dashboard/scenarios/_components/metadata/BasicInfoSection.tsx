'use client';

import { useState, type KeyboardEvent } from 'react';
import SectionCard from '../SectionCard';

const TAG_COLOR = '#6F7A8C';

interface Props {
  name: string;
  description: string;
  tags: string[];
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onTagsChange: (tags: string[]) => void;
  errors: Record<string, string>;
}

export default function BasicInfoSection({ name, description, tags, onNameChange, onDescriptionChange, onTagsChange, errors }: Props) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <SectionCard title="Basic Info">
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Scenario Name</label>
          <input
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder="e.g. Complete Checkout Flow"
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          {errors['metadata.name'] && <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors['metadata.name']}</p>}
        </div>

        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Description</label>
          <textarea
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="Describe the user journey this scenario models..."
            rows={3}
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>What real-world user behavior does this scenario simulate?</p>
          {errors['metadata.description'] && <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors['metadata.description']}</p>}
        </div>

        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>
            Tags <span className="font-normal" style={{ color: 'var(--rm-text-muted)' }}>(optional)</span>
          </label>
          <div
            className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg min-h-[40px]"
            style={{ background: 'var(--rm-bg-raised)' }}
          >
            {tags.map(tag => (
              <span
                key={tag}
                className="text-[12px] px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5"
                style={{
                  background: `${TAG_COLOR}18`,
                  color: TAG_COLOR,
                  border: `1px solid ${TAG_COLOR}35`,
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:opacity-70 leading-none text-[14px]"
                  style={{ color: TAG_COLOR }}
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (input.trim()) addTag(input); }}
              placeholder={tags.length === 0 ? 'Type a tag and press Enter' : ''}
              className="flex-1 min-w-[120px] text-[13px] bg-transparent border-none outline-none"
              style={{ color: 'var(--rm-text)' }}
            />
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>Press Enter or comma to add a tag</p>
        </div>
      </div>
    </SectionCard>
  );
}
