'use client';

import { useReducer, useCallback } from 'react';
import type {
  Scenario, ScenarioMetadata, ScenarioStep, LoadProfile,
  AuthConfig, ThinkTimeConfig, FailureConfig,
  LoadPatternConfig, DurationConfig, Variable, SecretRef,
  DataSource, StepConfig, StepType,
  ConnectionConfig, ProtocolConfig, NetworkConfig, ObservabilityConfig,
  RampConfig, StepAssertion, Extraction,
} from '../types';
import { create_default_scenario, create_default_step, create_default_step_config } from '../types';

// ─── Sub-tab configuration per protocol ────────────────────────────────

export type TopTab = 'metadata' | 'steps' | 'load-profile' | 'advanced';
export type StepSubTab =
  // Shared
  | 'auth' | 'validation' | 'extraction' | 'advanced'
  // REST
  | 'request' | 'payload'
  // GraphQL
  | 'query'
  // Browser
  | 'navigation' | 'actions' | 'storage';

interface SubTabDef {
  id: StepSubTab;
  label: string;
}

export const STEP_SUB_TABS: Record<StepType, SubTabDef[]> = {
  rest: [
    { id: 'request', label: 'Request' },
    { id: 'auth', label: 'Auth' },
    { id: 'payload', label: 'Payload' },
    { id: 'validation', label: 'Validation' },
    { id: 'extraction', label: 'Extraction' },
    { id: 'advanced', label: 'Advanced' },
  ],
  graphql: [
    { id: 'query', label: 'Query' },
    { id: 'auth', label: 'Auth' },
    { id: 'validation', label: 'Validation' },
    { id: 'extraction', label: 'Extraction' },
    { id: 'advanced', label: 'Advanced' },
  ],
  browser: [
    { id: 'navigation', label: 'Navigation' },
    { id: 'actions', label: 'Actions' },
    { id: 'storage', label: 'Storage' },
    { id: 'validation', label: 'Validation' },
    { id: 'extraction', label: 'Extraction' },
    { id: 'advanced', label: 'Advanced' },
  ],
};

export function getDefaultSubTab(stepType: StepType): StepSubTab {
  return STEP_SUB_TABS[stepType][0].id;
}

// ─── State Shape ─────────────────────────────────────────────────────────

export interface ScenarioBuilderState {
  scenario: Scenario;
  activeTab: TopTab;
  expandedStepId: string | null;
  stepSubTabs: Record<string, StepSubTab>;
  errors: Record<string, string>;
  isDirty: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_TAB'; tab: TopTab }
  | { type: 'SET_SCENARIO'; scenario: Scenario }
  // Metadata
  | { type: 'UPDATE_METADATA'; field: keyof ScenarioMetadata; value: unknown }
  | { type: 'SET_TAGS'; tags: string[] }
  | { type: 'SET_VARIABLES'; variables: Variable[] }
  | { type: 'SET_SECRETS'; secrets: SecretRef[] }
  // Steps
  | { type: 'ADD_STEP'; stepType?: StepType }
  | { type: 'CLONE_STEP'; stepId: string }
  | { type: 'REMOVE_STEP'; stepId: string }
  | { type: 'MOVE_STEP'; from: number; direction: -1 | 1 }
  | { type: 'EXPAND_STEP'; stepId: string | null }
  | { type: 'SET_STEP_SUB_TAB'; stepId: string; subTab: StepSubTab }
  | { type: 'UPDATE_STEP_FIELD'; stepId: string; field: keyof ScenarioStep; value: unknown }
  | { type: 'SET_STEP_CONFIG'; stepId: string; config: StepConfig }
  | { type: 'CHANGE_STEP_TYPE'; stepId: string; stepType: StepType }
  | { type: 'SET_STEP_AUTH'; stepId: string; auth: AuthConfig }
  | { type: 'SET_STEP_ASSERTIONS'; stepId: string; assertions: StepAssertion[] }
  | { type: 'SET_STEP_EXTRACTIONS'; stepId: string; extractions: Extraction[] }
  | { type: 'SET_STEP_THINK_TIME'; stepId: string; thinkTime: ThinkTimeConfig }
  | { type: 'SET_STEP_FAILURE'; stepId: string; failure: FailureConfig }
  // Load Profile
  | { type: 'UPDATE_LOAD_PROFILE'; field: keyof LoadProfile; value: unknown }
  | { type: 'SET_RAMP_UP'; ramp: RampConfig }
  | { type: 'SET_RAMP_DOWN'; ramp: RampConfig }
  | { type: 'SET_LOAD_PATTERN'; pattern: LoadPatternConfig }
  | { type: 'SET_DURATION'; duration: DurationConfig }
  | { type: 'SET_DATA_SOURCES'; sources: DataSource[] }
  | { type: 'SET_THINK_TIME_DEFAULTS'; thinkTime: ThinkTimeConfig }
  // Advanced
  | { type: 'SET_CONNECTION'; config: ConnectionConfig }
  | { type: 'SET_PROTOCOL'; config: ProtocolConfig }
  | { type: 'SET_NETWORK'; config: NetworkConfig }
  | { type: 'SET_OBSERVABILITY'; config: ObservabilityConfig }
  // Validation
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'CLEAR_ERRORS' };

// ─── Reducer ─────────────────────────────────────────────────────────────

function updateStep(state: ScenarioBuilderState, stepId: string, updater: (s: ScenarioStep) => ScenarioStep): ScenarioBuilderState {
  return {
    ...state,
    isDirty: true,
    scenario: {
      ...state.scenario,
      steps: state.scenario.steps.map(s => s.id === stepId ? updater(s) : s),
    },
  };
}

function reducer(state: ScenarioBuilderState, action: Action): ScenarioBuilderState {
  const dirty = { ...state, isDirty: true };

  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    case 'SET_SCENARIO':
      return { ...state, scenario: action.scenario, isDirty: false, errors: {} };

    // ── Metadata ──
    case 'UPDATE_METADATA':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          metadata: { ...dirty.scenario.metadata, [action.field]: action.value, updated_at: new Date().toISOString() },
        },
      };
    case 'SET_TAGS':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          metadata: { ...dirty.scenario.metadata, tags: action.tags, updated_at: new Date().toISOString() },
        },
      };
    case 'SET_VARIABLES':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          metadata: { ...dirty.scenario.metadata, global_variables: action.variables, updated_at: new Date().toISOString() },
        },
      };
    case 'SET_SECRETS':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          metadata: { ...dirty.scenario.metadata, secret_refs: action.secrets, updated_at: new Date().toISOString() },
        },
      };
    // ── Steps ──
    case 'ADD_STEP': {
      const stepType = action.stepType ?? 'rest';
      const newStep = create_default_step(stepType);
      const defaultSubTab = getDefaultSubTab(stepType);
      return {
        ...dirty,
        scenario: { ...dirty.scenario, steps: [...dirty.scenario.steps, newStep] },
        expandedStepId: newStep.id,
        stepSubTabs: { ...dirty.stepSubTabs, [newStep.id]: defaultSubTab },
      };
    }
    case 'CLONE_STEP': {
      const sourceIdx = dirty.scenario.steps.findIndex(s => s.id === action.stepId);
      if (sourceIdx === -1) return state;
      const source = dirty.scenario.steps[sourceIdx];
      const cloned: ScenarioStep = {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        name: source.name ? `${source.name} (Copy)` : '',
      };
      const steps = [...dirty.scenario.steps];
      steps.splice(sourceIdx + 1, 0, cloned);
      const defaultSubTab = getDefaultSubTab(cloned.config.step_type);
      return {
        ...dirty,
        scenario: { ...dirty.scenario, steps },
        expandedStepId: cloned.id,
        stepSubTabs: { ...dirty.stepSubTabs, [cloned.id]: defaultSubTab },
      };
    }
    case 'REMOVE_STEP': {
      const steps = dirty.scenario.steps.filter(s => s.id !== action.stepId);
      const { [action.stepId]: _, ...subTabs } = dirty.stepSubTabs;
      return {
        ...dirty,
        scenario: { ...dirty.scenario, steps },
        expandedStepId: dirty.expandedStepId === action.stepId ? null : dirty.expandedStepId,
        stepSubTabs: subTabs,
      };
    }
    case 'MOVE_STEP': {
      const to = action.from + action.direction;
      if (to < 0 || to >= dirty.scenario.steps.length) return state;
      const steps = [...dirty.scenario.steps];
      [steps[action.from], steps[to]] = [steps[to], steps[action.from]];
      return { ...dirty, scenario: { ...dirty.scenario, steps } };
    }
    case 'EXPAND_STEP':
      return {
        ...state,
        expandedStepId: state.expandedStepId === action.stepId ? null : action.stepId,
        stepSubTabs: action.stepId && !state.stepSubTabs[action.stepId]
          ? { ...state.stepSubTabs, [action.stepId]: getDefaultSubTab(state.scenario.steps.find(s => s.id === action.stepId)?.config.step_type ?? 'rest') }
          : state.stepSubTabs,
      };
    case 'SET_STEP_SUB_TAB':
      return { ...state, stepSubTabs: { ...state.stepSubTabs, [action.stepId]: action.subTab } };

    case 'UPDATE_STEP_FIELD':
      return updateStep(dirty, action.stepId, s => ({ ...s, [action.field]: action.value }));
    case 'SET_STEP_CONFIG':
      return updateStep(dirty, action.stepId, s => ({ ...s, config: action.config }));
    case 'CHANGE_STEP_TYPE': {
      const defaultSubTab = getDefaultSubTab(action.stepType);
      return {
        ...updateStep(dirty, action.stepId, s => ({ ...s, config: create_default_step_config(action.stepType) })),
        stepSubTabs: { ...dirty.stepSubTabs, [action.stepId]: defaultSubTab },
      };
    }
    case 'SET_STEP_AUTH':
      return updateStep(dirty, action.stepId, s => ({ ...s, auth: action.auth }));
    case 'SET_STEP_ASSERTIONS':
      return updateStep(dirty, action.stepId, s => ({ ...s, assertions: action.assertions }));
    case 'SET_STEP_EXTRACTIONS':
      return updateStep(dirty, action.stepId, s => ({ ...s, extractions: action.extractions }));
    case 'SET_STEP_THINK_TIME':
      return updateStep(dirty, action.stepId, s => ({ ...s, think_time: action.thinkTime }));
    case 'SET_STEP_FAILURE':
      return updateStep(dirty, action.stepId, s => ({ ...s, failure: action.failure }));

    // ── Load Profile ──
    case 'UPDATE_LOAD_PROFILE':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          load_profile: { ...dirty.scenario.load_profile, [action.field]: action.value },
        },
      };
    case 'SET_RAMP_UP':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          load_profile: { ...dirty.scenario.load_profile, ramp_up: action.ramp },
        },
      };
    case 'SET_RAMP_DOWN':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          load_profile: { ...dirty.scenario.load_profile, ramp_down: action.ramp },
        },
      };
    case 'SET_LOAD_PATTERN':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          load_profile: { ...dirty.scenario.load_profile, pattern: action.pattern },
        },
      };
    case 'SET_DURATION':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          load_profile: { ...dirty.scenario.load_profile, duration: action.duration },
        },
      };
    case 'SET_DATA_SOURCES':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          load_profile: { ...dirty.scenario.load_profile, data_sources: action.sources },
        },
      };
    case 'SET_THINK_TIME_DEFAULTS':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          load_profile: { ...dirty.scenario.load_profile, think_time_defaults: action.thinkTime },
        },
      };

    // ── Advanced ──
    case 'SET_CONNECTION':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          advanced: { ...(dirty.scenario.advanced!), connection: action.config },
        },
      };
    case 'SET_PROTOCOL':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          advanced: { ...(dirty.scenario.advanced!), protocol: action.config },
        },
      };
    case 'SET_NETWORK':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          advanced: { ...(dirty.scenario.advanced!), network: action.config },
        },
      };
    case 'SET_OBSERVABILITY':
      return {
        ...dirty,
        scenario: {
          ...dirty.scenario,
          advanced: { ...(dirty.scenario.advanced!), observability: action.config },
        },
      };

    // ── Validation ──
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'CLEAR_ERRORS':
      return { ...state, errors: {} };

    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────

function createInitialState(initial?: Scenario): ScenarioBuilderState {
  const scenario = initial ?? create_default_scenario();
  const firstStep = scenario.steps?.[0];
  return {
    scenario,
    activeTab: 'metadata',
    expandedStepId: firstStep?.id ?? null,
    stepSubTabs: firstStep
      ? { [firstStep.id]: getDefaultSubTab(firstStep.config.step_type) }
      : {},
    errors: {},
    isDirty: false,
  };
}

export function useScenarioBuilderState(initial?: Scenario) {
  const [state, dispatch] = useReducer(reducer, initial, createInitialState);

  const actions = {
    // Tab
    setActiveTab: useCallback((tab: TopTab) => dispatch({ type: 'SET_TAB', tab }), []),
    setScenario: useCallback((scenario: Scenario) => dispatch({ type: 'SET_SCENARIO', scenario }), []),

    // Metadata
    updateMetadata: useCallback(<K extends keyof ScenarioMetadata>(field: K, value: ScenarioMetadata[K]) =>
      dispatch({ type: 'UPDATE_METADATA', field, value }), []),
    setTags: useCallback((tags: string[]) => dispatch({ type: 'SET_TAGS', tags }), []),
    setVariables: useCallback((variables: Variable[]) => dispatch({ type: 'SET_VARIABLES', variables }), []),
    setSecrets: useCallback((secrets: SecretRef[]) => dispatch({ type: 'SET_SECRETS', secrets }), []),

    // Steps
    addStep: useCallback((stepType?: StepType) => dispatch({ type: 'ADD_STEP', stepType }), []),
    cloneStep: useCallback((stepId: string) => dispatch({ type: 'CLONE_STEP', stepId }), []),
    removeStep: useCallback((stepId: string) => dispatch({ type: 'REMOVE_STEP', stepId }), []),
    moveStep: useCallback((from: number, direction: -1 | 1) => dispatch({ type: 'MOVE_STEP', from, direction }), []),
    expandStep: useCallback((stepId: string | null) => dispatch({ type: 'EXPAND_STEP', stepId }), []),
    setStepSubTab: useCallback((stepId: string, subTab: StepSubTab) => dispatch({ type: 'SET_STEP_SUB_TAB', stepId, subTab }), []),
    updateStepField: useCallback(<K extends keyof ScenarioStep>(stepId: string, field: K, value: ScenarioStep[K]) =>
      dispatch({ type: 'UPDATE_STEP_FIELD', stepId, field, value }), []),
    setStepConfig: useCallback((stepId: string, config: StepConfig) => dispatch({ type: 'SET_STEP_CONFIG', stepId, config }), []),
    changeStepType: useCallback((stepId: string, stepType: StepType) => dispatch({ type: 'CHANGE_STEP_TYPE', stepId, stepType }), []),
    setStepAuth: useCallback((stepId: string, auth: AuthConfig) => dispatch({ type: 'SET_STEP_AUTH', stepId, auth }), []),
    setStepAssertions: useCallback((stepId: string, assertions: StepAssertion[]) => dispatch({ type: 'SET_STEP_ASSERTIONS', stepId, assertions }), []),
    setStepExtractions: useCallback((stepId: string, extractions: Extraction[]) => dispatch({ type: 'SET_STEP_EXTRACTIONS', stepId, extractions }), []),
    setStepThinkTime: useCallback((stepId: string, thinkTime: ThinkTimeConfig) => dispatch({ type: 'SET_STEP_THINK_TIME', stepId, thinkTime }), []),
    setStepFailure: useCallback((stepId: string, failure: FailureConfig) => dispatch({ type: 'SET_STEP_FAILURE', stepId, failure }), []),

    // Load Profile
    updateLoadProfile: useCallback(<K extends keyof LoadProfile>(field: K, value: LoadProfile[K]) =>
      dispatch({ type: 'UPDATE_LOAD_PROFILE', field, value }), []),
    setRampUp: useCallback((ramp: RampConfig) => dispatch({ type: 'SET_RAMP_UP', ramp }), []),
    setRampDown: useCallback((ramp: RampConfig) => dispatch({ type: 'SET_RAMP_DOWN', ramp }), []),
    setLoadPattern: useCallback((pattern: LoadPatternConfig) => dispatch({ type: 'SET_LOAD_PATTERN', pattern }), []),
    setDuration: useCallback((duration: DurationConfig) => dispatch({ type: 'SET_DURATION', duration }), []),
    setDataSources: useCallback((sources: DataSource[]) => dispatch({ type: 'SET_DATA_SOURCES', sources }), []),
    setThinkTimeDefaults: useCallback((thinkTime: ThinkTimeConfig) => dispatch({ type: 'SET_THINK_TIME_DEFAULTS', thinkTime }), []),

    // Advanced
    setConnection: useCallback((config: ConnectionConfig) => dispatch({ type: 'SET_CONNECTION', config }), []),
    setProtocol: useCallback((config: ProtocolConfig) => dispatch({ type: 'SET_PROTOCOL', config }), []),
    setNetwork: useCallback((config: NetworkConfig) => dispatch({ type: 'SET_NETWORK', config }), []),
    setObservability: useCallback((config: ObservabilityConfig) => dispatch({ type: 'SET_OBSERVABILITY', config }), []),

    // Validation
    setErrors: useCallback((errors: Record<string, string>) => dispatch({ type: 'SET_ERRORS', errors }), []),
    clearErrors: useCallback(() => dispatch({ type: 'CLEAR_ERRORS' }), []),

    validate: useCallback((): { valid: boolean; errors: Record<string, string>; firstErrorTab: TopTab | null } => {
      const e: Record<string, string> = {};
      const s = state.scenario;

      // Metadata
      if (!s.metadata.name.trim()) e['metadata.name'] = 'Scenario name is required.';
      else if (s.metadata.name.trim().length > 100) e['metadata.name'] = 'Name must be 100 characters or fewer.';
      if (!s.metadata.description.trim()) e['metadata.description'] = 'Description is required.';

      // Steps
      if (s.steps.length === 0) {
        e['steps'] = 'Add at least one step.';
      } else {
        s.steps.forEach((step, i) => {
          if (!step.name.trim()) {
            const hasContent = stepHasContent(step);
            if (hasContent) {
              e[`steps.${step.id}.name`] = `Step ${i + 1}: Name is required.`;
            }
          }

          switch (step.config.step_type) {
            case 'rest': {
              const rest = step.config.rest;
              if (!rest) break;
              if (step.name.trim() && !rest.path.trim())
                e[`steps.${step.id}.path`] = `Step ${i + 1}: Path is required.`;
              else if (rest.path.trim() && !rest.path.trim().startsWith('/'))
                e[`steps.${step.id}.path`] = `Step ${i + 1}: Path must start with /.`;
              if (rest.payload.content_type === 'json' && rest.payload.json?.trim()) {
                try { JSON.parse(rest.payload.json); } catch {
                  e[`steps.${step.id}.payload`] = `Step ${i + 1}: JSON body must be valid JSON.`;
                }
              }
              break;
            }
            case 'graphql': {
              const gql = step.config.graphql;
              if (!gql) break;
              if (step.name.trim() && !gql.query.trim())
                e[`steps.${step.id}.query`] = `Step ${i + 1}: GraphQL query is required.`;
              if (gql.variables.trim() && gql.variables.trim() !== '{}') {
                try { JSON.parse(gql.variables); } catch {
                  e[`steps.${step.id}.variables`] = `Step ${i + 1}: Variables must be valid JSON.`;
                }
              }
              break;
            }
            case 'browser': {
              const browser = step.config.browser;
              if (!browser) break;
              if (step.name.trim() && !browser.url.trim())
                e[`steps.${step.id}.url`] = `Step ${i + 1}: URL is required.`;
              break;
            }
          }
        });
      }

      // Load profile
      if (s.load_profile.virtual_users < 1) e['load_profile.virtual_users'] = 'At least 1 virtual user is required.';

      let firstErrorTab: TopTab | null = null;
      if (Object.keys(e).some(k => k.startsWith('metadata'))) firstErrorTab = 'metadata';
      else if (Object.keys(e).some(k => k.startsWith('steps'))) firstErrorTab = 'steps';
      else if (Object.keys(e).some(k => k.startsWith('load_profile'))) firstErrorTab = 'load-profile';
      else if (Object.keys(e).some(k => k.startsWith('advanced'))) firstErrorTab = 'advanced';

      dispatch({ type: 'SET_ERRORS', errors: e });
      return { valid: Object.keys(e).length === 0, errors: e, firstErrorTab };
    }, [state.scenario]),
  };

  return { state, actions };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function stepHasContent(step: ScenarioStep): boolean {
  switch (step.config.step_type) {
    case 'rest':
      return !!(step.config.rest?.path.trim());
    case 'graphql':
      return !!(step.config.graphql?.query.trim());
    case 'browser':
      return !!(step.config.browser?.url.trim() || (step.config.browser?.actions.length ?? 0) > 0);
    default:
      return false;
  }
}
