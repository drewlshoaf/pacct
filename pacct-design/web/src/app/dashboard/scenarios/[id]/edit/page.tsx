'use client';

import { useScenario } from '../../_store/scenarioStore';
import ScenarioBuilderShell from '../../_components/ScenarioBuilderShell';

export default function EditScenarioPage({ params }: { params: { id: string } }) {
  const scenario = useScenario(params.id);

  if (!scenario) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--rm-text-muted)' }}>
        <p className="text-[14px]">Scenario not found.</p>
      </div>
    );
  }

  return <ScenarioBuilderShell mode="edit" initial={scenario} scenarioId={params.id} />;
}
