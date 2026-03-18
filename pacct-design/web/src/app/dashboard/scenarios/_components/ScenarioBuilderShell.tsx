'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { useToast } from '@/components/ui/Toast';
import TabBar from './TabBar';
import MetadataTab from './metadata/MetadataTab';
import StepsTab from './steps/StepsTab';
import LoadProfileTab from './load-profile/LoadProfileTab';
import AdvancedTab from './advanced/AdvancedTab';
import { useScenarioBuilderState } from './useScenarioBuilderState';
import type { TopTab } from './useScenarioBuilderState';
import type { Scenario } from '../types';
import { saveScenarioToServer, saveScenario } from '../_store/scenarioStore';
import RunButton from '@/components/run/RunButton';

const TOP_TABS = [
  { id: 'metadata', label: 'Metadata' },
  { id: 'steps', label: 'Steps' },
  { id: 'load-profile', label: 'Load Profile' },
  { id: 'advanced', label: 'Advanced' },
];

interface Props {
  mode: 'create' | 'edit';
  initial?: Scenario;
  scenarioId?: string;
}

export default function ScenarioBuilderShell({ mode, initial }: Props) {
  const { state, actions } = useScenarioBuilderState(initial);
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const tabsWithBadges = TOP_TABS.map(tab => {
    if (tab.id === 'steps') return { ...tab, badge: state.scenario.steps.length };
    return tab;
  });

  const handleSave = async () => {
    const { valid, errors, firstErrorTab } = actions.validate();
    if (!valid) {
      if (firstErrorTab) actions.setActiveTab(firstErrorTab);
      const messages = Object.values(errors);
      const description = messages.length <= 3
        ? messages.join(' ')
        : `${messages.slice(0, 3).join(' ')} (+${messages.length - 3} more)`;
      toast({ title: 'Validation failed', description, type: 'error' });
      return;
    }

    setSaving(true);
    try {
      await saveScenarioToServer(state.scenario);
    } catch {
      // API failed — fall back to localStorage
      saveScenario(state.scenario);
    }
    setSaving(false);

    toast({
      title: mode === 'create' ? 'Scenario created' : 'Scenario updated',
      description: `"${state.scenario.metadata.name.trim()}" has been saved.`,
      type: 'success',
    });

    router.push('/dashboard/scenarios');
  };

  const title = mode === 'create' ? 'Create Scenario' : 'Edit Scenario';
  const description = mode === 'create'
    ? 'Define a deterministic behavioral model for load testing'
    : 'Modify scenario configuration';

  return (
    <PortalLayout>
      <PageHeader
        title={title}
        description={description}
        actions={<Link href="/dashboard/scenarios" className="btn btn-ghost text-[13px]">Cancel</Link>}
      />

      <div className="max-w-3xl">
        {/* Tab bar */}
        <TabBar
          tabs={tabsWithBadges}
          activeTab={state.activeTab}
          onTabChange={id => actions.setActiveTab(id as TopTab)}
          sticky
        />

        {/* Content card — no top radius to merge with tab bar */}
        <div
          style={{
            background: 'var(--rm-bg-surface)',
            border: '1px solid var(--rm-border)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
          }}
        >
          {state.activeTab === 'metadata' && (
            <MetadataTab
              metadata={state.scenario.metadata}
              errors={state.errors}
              onUpdateField={actions.updateMetadata}
              onSetTags={actions.setTags}
              onSetVariables={actions.setVariables}
              onSetSecrets={actions.setSecrets}
            />
          )}

          {state.activeTab === 'steps' && (
            <StepsTab
              steps={state.scenario.steps}
              expandedStepId={state.expandedStepId}
              stepSubTabs={state.stepSubTabs}
              errors={state.errors}
              onAddStep={actions.addStep}
              onCloneStep={actions.cloneStep}
              onRemoveStep={actions.removeStep}
              onMoveStep={actions.moveStep}
              onExpandStep={actions.expandStep}
              onSetStepSubTab={actions.setStepSubTab}
              onUpdateStepField={actions.updateStepField}
              onSetStepConfig={actions.setStepConfig}
              onChangeStepType={actions.changeStepType}
              onSetStepAuth={actions.setStepAuth}
              onSetStepAssertions={actions.setStepAssertions}
              onSetStepExtractions={actions.setStepExtractions}
              onSetStepThinkTime={actions.setStepThinkTime}
              onSetStepFailure={actions.setStepFailure}
            />
          )}

          {state.activeTab === 'load-profile' && (
            <LoadProfileTab
              loadProfile={state.scenario.load_profile}
              errors={state.errors}
              onUpdateField={actions.updateLoadProfile}
              onSetRampUp={actions.setRampUp}
              onSetRampDown={actions.setRampDown}
              onSetLoadPattern={actions.setLoadPattern}
              onSetDuration={actions.setDuration}
              onSetDataSources={actions.setDataSources}
              onSetThinkTimeDefaults={actions.setThinkTimeDefaults}
            />
          )}

          {state.activeTab === 'advanced' && (
            <AdvancedTab
              config={state.scenario.advanced}
              onConnectionChange={actions.setConnection}
              onProtocolChange={actions.setProtocol}
              onNetworkChange={actions.setNetwork}
              onObservabilityChange={actions.setObservability}
            />
          )}
        </div>

        {/* Save bar */}
        <div
          className="sticky bottom-0 flex items-center justify-between py-4 mt-4"
          style={{ background: 'linear-gradient(transparent, var(--rm-bg-void) 30%)' }}
        >
          <Link href="/dashboard/scenarios" className="btn btn-ghost text-[13px]">Cancel</Link>
          <div className="flex items-center gap-3">
            {mode === 'edit' && (
              <RunButton scenarioId={state.scenario.metadata.id} scenarioBaseUrl={state.scenario.metadata.base_url} />
            )}
            <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : mode === 'create' ? 'Save Scenario' : 'Update Scenario'}
            </button>
          </div>
        </div>
      </div>

    </PortalLayout>
  );
}
