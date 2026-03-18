'use client';

import type { ScenarioStep, StepConfig, StepType, AuthConfig, StepAssertion, Extraction, ThinkTimeConfig, FailureConfig } from '../../types';
import { METHOD_COLORS, STEP_TYPE_LABELS, STEP_TYPE_COLORS, STEP_TYPES } from '../../types';
import type { StepSubTab } from '../useScenarioBuilderState';
import { STEP_SUB_TABS } from '../useScenarioBuilderState';
import TabBar from '../TabBar';
import RequestSubTab from './RequestSubTab';
import AuthSubTab from './AuthSubTab';
import PayloadSubTab from './PayloadSubTab';
import ValidationSubTab from './ValidationSubTab';
import ExtractionSubTab from './ExtractionSubTab';
import StepAdvancedSubTab from './StepAdvancedSubTab';
import GraphQLQuerySubTab from './GraphQLQuerySubTab';
import BrowserNavigationSubTab from './BrowserNavigationSubTab';
import BrowserActionsSubTab from './BrowserActionsSubTab';
import BrowserStorageSubTab from './BrowserStorageSubTab';

interface StepCardProps {
  step: ScenarioStep;
  index: number;
  totalSteps: number;
  isExpanded: boolean;
  activeSubTab: StepSubTab;
  errors: Record<string, string>;
  onToggleExpanded: () => void;
  onSubTabChange: (subTab: StepSubTab) => void;
  onMove: (direction: -1 | 1) => void;
  onClone: () => void;
  onRemove: () => void;
  onUpdateField: <K extends keyof ScenarioStep>(field: K, value: ScenarioStep[K]) => void;
  onSetConfig: (config: StepConfig) => void;
  onChangeStepType: (stepType: StepType) => void;
  onSetAuth: (auth: AuthConfig) => void;
  onSetAssertions: (assertions: StepAssertion[]) => void;
  onSetExtractions: (extractions: Extraction[]) => void;
  onSetThinkTime: (thinkTime: ThinkTimeConfig) => void;
  onSetFailure: (failure: FailureConfig) => void;
}

function getStepSummary(step: ScenarioStep): { badge: string; detail: string; badgeColor: string } {
  const stepType = step.config.step_type;
  const typeColor = STEP_TYPE_COLORS[stepType];

  switch (stepType) {
    case 'rest': {
      const rest = step.config.rest;
      const method = rest?.method ?? 'GET';
      return {
        badge: method,
        badgeColor: METHOD_COLORS[method],
        detail: rest?.path ?? '',
      };
    }
    case 'graphql': {
      const gql = step.config.graphql;
      return {
        badge: gql?.operation_type ?? 'query',
        badgeColor: typeColor,
        detail: gql?.endpoint ?? '/graphql',
      };
    }
    case 'browser': {
      const browser = step.config.browser;
      return {
        badge: '',
        badgeColor: typeColor,
        detail: browser?.url ?? '',
      };
    }
    default:
      return { badge: '', badgeColor: typeColor, detail: '' };
  }
}

export default function StepCard({
  step, index, totalSteps, isExpanded, activeSubTab, errors,
  onToggleExpanded, onSubTabChange, onMove, onClone, onRemove,
  onUpdateField, onSetConfig, onChangeStepType,
  onSetAuth, onSetAssertions,
  onSetExtractions, onSetThinkTime, onSetFailure,
}: StepCardProps) {
  const stepType = step.config.step_type;
  const typeColor = STEP_TYPE_COLORS[stepType];
  const typeLabel = STEP_TYPE_LABELS[stepType];
  const { badge, badgeColor, detail } = getStepSummary(step);
  const hasAuth = step.auth.type !== 'none';
  const hasAssertions = step.assertions.length > 0;
  const hasExtractions = step.extractions.length > 0;

  // Build sub-tabs with badges
  const subTabs = STEP_SUB_TABS[stepType];
  const tabsWithBadges = subTabs.map(tab => {
    let tabBadge: string | number | undefined;
    if (tab.id === 'validation' && hasAssertions) tabBadge = step.assertions.length;
    if (tab.id === 'extraction' && hasExtractions) tabBadge = step.extractions.length;
    return { ...tab, badge: tabBadge };
  });

  const renderSubTab = () => {
    switch (activeSubTab) {
      // REST
      case 'request':
        return <RequestSubTab step={step} errors={errors} onUpdateField={onUpdateField} onSetConfig={onSetConfig} />;
      case 'payload':
        return <PayloadSubTab step={step} errors={errors} onSetConfig={onSetConfig} />;
      // GraphQL
      case 'query':
        return <GraphQLQuerySubTab step={step} errors={errors} onSetConfig={onSetConfig} />;
      // Browser
      case 'navigation':
        return <BrowserNavigationSubTab step={step} errors={errors} onSetConfig={onSetConfig} />;
      case 'actions':
        return <BrowserActionsSubTab step={step} errors={errors} onSetConfig={onSetConfig} />;
      case 'storage':
        return <BrowserStorageSubTab step={step} errors={errors} onSetConfig={onSetConfig} />;
      // Shared
      case 'auth':
        return <AuthSubTab step={step} errors={errors} onSetAuth={onSetAuth} />;
      case 'validation':
        return <ValidationSubTab step={step} errors={errors} onSetAssertions={onSetAssertions} />;
      case 'extraction':
        return <ExtractionSubTab step={step} errors={errors} onSetExtractions={onSetExtractions} />;
      case 'advanced':
        return <StepAdvancedSubTab step={step} errors={errors} onSetThinkTime={onSetThinkTime} onSetFailure={onSetFailure} />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
      {/* Collapsed header */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
        onClick={onToggleExpanded}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}
        >
          {index + 1}
        </span>

        {/* Protocol type badge */}
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: 'var(--rm-signal-glow)', color: typeColor }}
        >
          {typeLabel}
        </span>

        {/* Method / operation badge */}
        {badge && (
          <span
            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'var(--rm-signal-glow)', color: badgeColor }}
          >
            {badge}
          </span>
        )}

        <span className="text-[13px] truncate" style={{ color: step.name ? 'var(--rm-text)' : 'var(--rm-text-muted)' }}>
          {step.name || 'Untitled step'}
        </span>

        {detail && (
          <span className="text-[12px] font-mono truncate hidden sm:inline" style={{ color: 'var(--rm-text-muted)' }}>
            {detail}
          </span>
        )}

        {/* Status indicators */}
        <div className="flex items-center gap-1.5 ml-auto mr-2 flex-shrink-0">
          {hasAuth && (
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--rm-signal)' }} title="Has authentication" />
          )}
          {hasAssertions && (
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--rm-pass)' }} title="Has assertions" />
          )}
          {hasExtractions && (
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--rm-caution)' }} title="Has extractions" />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)] disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ color: 'var(--rm-text-muted)' }}
            title="Move up"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === totalSteps - 1}
            className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)] disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ color: 'var(--rm-text-muted)' }}
            title="Move down"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)]"
            style={{ color: 'var(--rm-text-muted)' }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isExpanded
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />
              }
            </svg>
          </button>
          <button
            type="button"
            onClick={onClone}
            className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)]"
            style={{ color: 'var(--rm-text-muted)' }}
            title="Clone step"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          </button>
          {totalSteps > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)]"
              style={{ color: 'var(--rm-text-muted)' }}
              title="Remove step"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--rm-border)' }}>
          {/* Step type selector */}
          <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'var(--rm-bg-raised)', borderBottom: '1px solid var(--rm-border)' }}>
            <span className="text-[11px] font-medium" style={{ color: 'var(--rm-text-muted)' }}>Protocol:</span>
            {STEP_TYPES.map(st => {
              const active = st === stepType;
              const color = STEP_TYPE_COLORS[st];
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => { if (!active) onChangeStepType(st); }}
                  className="text-[11px] font-medium px-2 py-1 rounded transition-colors"
                  style={{
                    background: active ? 'var(--rm-signal-glow)' : 'transparent',
                    color: active ? color : 'var(--rm-text-muted)',
                    border: active ? '1px solid var(--rm-border-hover)' : '1px solid transparent',
                  }}
                >
                  {STEP_TYPE_LABELS[st]}
                </button>
              );
            })}
          </div>

          <TabBar
            tabs={tabsWithBadges}
            activeTab={activeSubTab}
            onTabChange={id => onSubTabChange(id as StepSubTab)}
            size="sm"
          />
          <div className="p-4">
            {renderSubTab()}
          </div>
        </div>
      )}
    </div>
  );
}
