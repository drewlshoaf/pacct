'use client';

import { useState, useRef, useEffect } from 'react';
import type { ScenarioStep, StepConfig, StepType, AuthConfig, StepAssertion, Extraction, ThinkTimeConfig, FailureConfig } from '../../types';
import { STEP_TYPES, STEP_TYPE_LABELS, STEP_TYPE_COLORS } from '../../types';
import type { StepSubTab } from '../useScenarioBuilderState';
import StepCard from './StepCard';

interface Props {
  steps: ScenarioStep[];
  expandedStepId: string | null;
  stepSubTabs: Record<string, StepSubTab>;
  errors: Record<string, string>;
  onAddStep: (stepType?: StepType) => void;
  onCloneStep: (stepId: string) => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (from: number, direction: -1 | 1) => void;
  onExpandStep: (stepId: string | null) => void;
  onSetStepSubTab: (stepId: string, subTab: StepSubTab) => void;
  onUpdateStepField: <K extends keyof ScenarioStep>(stepId: string, field: K, value: ScenarioStep[K]) => void;
  onSetStepConfig: (stepId: string, config: StepConfig) => void;
  onChangeStepType: (stepId: string, stepType: StepType) => void;
  onSetStepAuth: (stepId: string, auth: AuthConfig) => void;
  onSetStepAssertions: (stepId: string, assertions: StepAssertion[]) => void;
  onSetStepExtractions: (stepId: string, extractions: Extraction[]) => void;
  onSetStepThinkTime: (stepId: string, thinkTime: ThinkTimeConfig) => void;
  onSetStepFailure: (stepId: string, failure: FailureConfig) => void;
}

export default function StepsTab({
  steps, expandedStepId, stepSubTabs, errors,
  onAddStep, onCloneStep, onRemoveStep, onMoveStep, onExpandStep, onSetStepSubTab,
  onUpdateStepField, onSetStepConfig, onChangeStepType,
  onSetStepAuth, onSetStepAssertions,
  onSetStepExtractions, onSetStepThinkTime, onSetStepFailure,
}: Props) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTypeMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTypeMenu]);

  return (
    <div className="p-5">
      <p className="text-[12px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>
        Each step represents a single protocol transaction. Choose a protocol type and configure its request, auth, validation, and extraction per step.
      </p>

      {errors['steps'] && (
        <p className="text-[11px] mb-3" style={{ color: 'var(--rm-fail)' }}>{errors['steps']}</p>
      )}

      <div className="space-y-2">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            totalSteps={steps.length}
            isExpanded={expandedStepId === step.id}
            activeSubTab={stepSubTabs[step.id] || 'request'}
            errors={errors}
            onToggleExpanded={() => onExpandStep(step.id)}
            onSubTabChange={subTab => onSetStepSubTab(step.id, subTab)}
            onMove={dir => onMoveStep(i, dir)}
            onClone={() => onCloneStep(step.id)}
            onRemove={() => onRemoveStep(step.id)}
            onUpdateField={(field, value) => onUpdateStepField(step.id, field, value)}
            onSetConfig={config => onSetStepConfig(step.id, config)}
            onChangeStepType={st => onChangeStepType(step.id, st)}
            onSetAuth={auth => onSetStepAuth(step.id, auth)}
            onSetAssertions={assertions => onSetStepAssertions(step.id, assertions)}
            onSetExtractions={extractions => onSetStepExtractions(step.id, extractions)}
            onSetThinkTime={thinkTime => onSetStepThinkTime(step.id, thinkTime)}
            onSetFailure={failure => onSetStepFailure(step.id, failure)}
          />
        ))}
      </div>

      {/* Add Step with protocol selector */}
      <div className="relative mt-3" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--rm-signal)', background: 'var(--rm-signal-glow)', border: '1px solid var(--rm-signal-glow)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Step
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        {showTypeMenu && (
          <div
            className="absolute left-0 top-full mt-1 rounded-lg shadow-lg py-1 z-20"
            style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', minWidth: '180px' }}
          >
            {STEP_TYPES.map(st => {
              const color = STEP_TYPE_COLORS[st];
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    onAddStep(st);
                    setShowTypeMenu(false);
                  }}
                  className="flex items-center gap-2 w-full text-left text-[13px] px-3 py-2 transition-colors hover:bg-[var(--rm-bg-hover)]"
                  style={{ color: 'var(--rm-text)' }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  {STEP_TYPE_LABELS[st]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
