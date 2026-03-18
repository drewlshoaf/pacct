'use client';

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div
      className="space-y-4"
      style={{
        padding: '20px',
        background: 'var(--rm-bg-surface)',
        borderRadius: '8px',
        border: '1px solid var(--rm-border)',
      }}
    >
      <div>
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>{title}</h3>
        {description && (
          <p className="text-[12px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
