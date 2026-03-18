'use client';

import { useParams } from 'next/navigation';
import GateFormPage from '../../_components/GateFormPage';
import { useGate } from '../../_store/gateStore';

export default function EditGatePage() {
  const params = useParams();
  const id = params.id as string;
  const gate = useGate(id);

  if (!gate) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ color: 'var(--rm-text-muted)' }}>
        <p className="text-[13px]">Loading gate...</p>
      </div>
    );
  }

  return <GateFormPage gate={gate} />;
}
