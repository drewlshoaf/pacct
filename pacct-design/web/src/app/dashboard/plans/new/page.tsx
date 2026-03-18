'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchPlanDetail } from '@/lib/api';
import { create_default_plan } from '@loadtoad/schema';
import type { Plan } from '@loadtoad/schema';
import PlanBuilderForm from '../_components/PlanBuilderForm';

function NewPlanInner() {
  const searchParams = useSearchParams();
  const cloneId = searchParams.get('clone');
  const [initialPlan, setInitialPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(!!cloneId);

  useEffect(() => {
    if (!cloneId) {
      setInitialPlan(create_default_plan());
      return;
    }
    fetchPlanDetail(cloneId).then(data => {
      if (data?.plan) {
        const now = new Date().toISOString();
        setInitialPlan({
          ...data.plan,
          id: crypto.randomUUID(),
          name: `${data.plan.name} (Copy)`,
          status: 'paused',
          created_at: now,
          updated_at: now,
        });
      } else {
        setInitialPlan(create_default_plan());
      }
      setLoading(false);
    });
  }, [cloneId]);

  if (loading || !initialPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[14px]" style={{ color: 'var(--rm-text-muted)' }}>Loading...</p>
      </div>
    );
  }

  return <PlanBuilderForm initialPlan={initialPlan} mode="create" />;
}

export default function NewPlanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[14px]" style={{ color: 'var(--rm-text-muted)' }}>Loading...</p>
      </div>
    }>
      <NewPlanInner />
    </Suspense>
  );
}
