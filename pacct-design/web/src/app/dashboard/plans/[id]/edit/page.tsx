'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchPlanDetail } from '@/lib/api';
import type { Plan } from '@loadtoad/schema';
import PlanBuilderForm from '../../_components/PlanBuilderForm';

export default function EditPlanPage() {
  const params = useParams();
  const planId = params.id as string;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPlanDetail(planId).then(data => {
      if (data?.plan) {
        setPlan(data.plan);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [planId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[14px]" style={{ color: 'var(--rm-text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[14px]" style={{ color: 'var(--rm-fail)' }}>Plan not found.</p>
      </div>
    );
  }

  return <PlanBuilderForm initialPlan={plan} mode="edit" />;
}
