import { useReducer, useCallback } from 'react';
import type { SchemaSpec, SchemaField, ComputationSpec, GovernanceSpec, EconomicSpec } from '@pacct/specs';
import {
  schemaSpecSchema,
  computationSpecSchema,
  governanceSpecSchema,
  economicSpecSchema,
} from '@pacct/specs';
import {
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  VisibilityMode,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';

// ---- Types for partial wizard data ----

export interface BasicsData {
  name: string;
  description: string;
  category: string;
}

export interface SchemaData {
  fields: SchemaField[];
  identifierFieldName: string;
}

export interface ComputationData {
  computationType: string;
  featureFields: string[];
  targetField: string;
  revealMode: string;
  clipMin: string;
  clipMax: string;
  normalize: boolean;
}

export interface GovernanceData {
  minActiveMembers: number;
  maxMembers: string;
  visibilityMode: string;
  sectionVisibility: {
    schema: string;
    computation: string;
    governance: string;
    economic: string;
  };
  approvalTimeoutMs: number;
  acceptanceTimeoutMs: number;
  admissionSchedule: Array<{
    memberCountMin: number;
    memberCountMax: number;
    threshold: number;
  }>;
  dissolutionThreshold: number;
  allowedInitiators: string;
  minimumIntervalMs: number;
  maxRunsPerPeriod: number;
  periodLengthDays: number;
  requireCostEstimate: boolean;
  allMembersOnlineRequired: boolean;
  preActivationTimeoutMs: number;
  postActivationInactivityTimeoutMs: number;
  warnBeforeDissolveMs: string;
  expulsionEnabled: boolean;
  expulsionRequireReason: boolean;
  expulsionThreshold: string;
}

export interface EconomicData {
  economicMode: string;
  fixedCostPerRun: number;
  variableCostEnabled: boolean;
  variableCostDescription: string;
  maxTotalBudget: string;
  maxBudgetPerPeriod: string;
  budgetPeriodLengthDays: string;
  summary: string;
}

export interface WizardState {
  currentStep: number;
  basics: BasicsData;
  schema: SchemaData;
  computation: ComputationData;
  governance: GovernanceData;
  economic: EconomicData;
  acknowledged: boolean;
  stepValidation: Record<number, boolean>;
}

export const WIZARD_STEPS = [
  { index: 0, label: 'Basics' },
  { index: 1, label: 'Schema' },
  { index: 2, label: 'Computation' },
  { index: 3, label: 'Governance' },
  { index: 4, label: 'Economics' },
  { index: 5, label: 'Review' },
] as const;

// ---- Default state ----

function defaultState(): WizardState {
  return {
    currentStep: 0,
    basics: { name: '', description: '', category: '' },
    schema: {
      fields: [
        { name: 'record_id', type: 'string_id', required: true, description: 'Unique identifier' },
      ],
      identifierFieldName: 'record_id',
    },
    computation: {
      computationType: 'regression',
      featureFields: [],
      targetField: '',
      revealMode: 'coefficients',
      clipMin: '',
      clipMax: '',
      normalize: true,
    },
    governance: {
      minActiveMembers: 3,
      maxMembers: '',
      visibilityMode: 'full',
      sectionVisibility: { schema: 'full', computation: 'full', governance: 'full', economic: 'full' },
      approvalTimeoutMs: 86400000,
      acceptanceTimeoutMs: 86400000,
      admissionSchedule: [{ memberCountMin: 1, memberCountMax: 5, threshold: 1.0 }],
      dissolutionThreshold: 0.75,
      allowedInitiators: 'any_member',
      minimumIntervalMs: 3600000,
      maxRunsPerPeriod: 10,
      periodLengthDays: 30,
      requireCostEstimate: false,
      allMembersOnlineRequired: true,
      preActivationTimeoutMs: 604800000,
      postActivationInactivityTimeoutMs: 2592000000,
      warnBeforeDissolveMs: '',
      expulsionEnabled: false,
      expulsionRequireReason: false,
      expulsionThreshold: '',
    },
    economic: {
      economicMode: 'progressive',
      fixedCostPerRun: 0,
      variableCostEnabled: false,
      variableCostDescription: '',
      maxTotalBudget: '',
      maxBudgetPerPeriod: '',
      budgetPeriodLengthDays: '',
      summary: 'Equal cost sharing for collaborative analytics',
    },
    acknowledged: false,
    stepValidation: {},
  };
}

// ---- Reducer ----

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_BASICS'; data: Partial<BasicsData> }
  | { type: 'UPDATE_SCHEMA'; data: Partial<SchemaData> }
  | { type: 'UPDATE_COMPUTATION'; data: Partial<ComputationData> }
  | { type: 'UPDATE_GOVERNANCE'; data: Partial<GovernanceData> }
  | { type: 'UPDATE_ECONOMIC'; data: Partial<EconomicData> }
  | { type: 'SET_ACKNOWLEDGED'; value: boolean }
  | { type: 'SET_STEP_VALID'; step: number; valid: boolean }
  | { type: 'LOAD_TEMPLATE'; state: Partial<WizardState> }
  | { type: 'RESET' };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'UPDATE_BASICS':
      return { ...state, basics: { ...state.basics, ...action.data } };
    case 'UPDATE_SCHEMA': {
      const newSchema = { ...state.schema, ...action.data };
      // Sync computation: prune featureFields and targetField that no longer exist in schema
      const fieldNames = new Set(newSchema.fields.map(f => f.name));
      const prunedFeatures = state.computation.featureFields.filter(f => fieldNames.has(f));
      const prunedTarget = fieldNames.has(state.computation.targetField) ? state.computation.targetField : '';
      return {
        ...state,
        schema: newSchema,
        computation: {
          ...state.computation,
          featureFields: prunedFeatures,
          targetField: prunedTarget,
        },
      };
    }
    case 'UPDATE_COMPUTATION':
      return { ...state, computation: { ...state.computation, ...action.data } };
    case 'UPDATE_GOVERNANCE':
      return { ...state, governance: { ...state.governance, ...action.data } };
    case 'UPDATE_ECONOMIC':
      return { ...state, economic: { ...state.economic, ...action.data } };
    case 'SET_ACKNOWLEDGED':
      return { ...state, acknowledged: action.value };
    case 'SET_STEP_VALID':
      return { ...state, stepValidation: { ...state.stepValidation, [action.step]: action.valid } };
    case 'LOAD_TEMPLATE': {
      const base = defaultState();
      return {
        ...state,
        basics: { ...state.basics, ...(action.state.basics ?? {}) },
        schema: { ...base.schema, ...(action.state.schema ?? {}) },
        computation: { ...base.computation, ...(action.state.computation ?? {}) },
        governance: { ...base.governance, ...(action.state.governance ?? {}) },
        economic: { ...base.economic, ...(action.state.economic ?? {}) },
        stepValidation: {},
      };
    }
    case 'RESET':
      return defaultState();
    default:
      return state;
  }
}

// ---- Spec builders: convert wizard state to full spec objects ----

function generateSpecId(prefix: string): SpecId {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as SpecId;
}

export function buildSchemaSpec(state: WizardState): SchemaSpec {
  const now = Date.now();
  return {
    specId: generateSpecId('schema'),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: `${state.basics.name} Schema`,
    description: state.basics.description || undefined,
    fields: state.schema.fields,
    identifierFieldName: state.schema.identifierFieldName,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildComputationSpec(state: WizardState): ComputationSpec {
  const now = Date.now();
  return {
    specId: generateSpecId('comp'),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: `${state.basics.name} Computation`,
    description: state.basics.description || undefined,
    computationType: ComputationType.Regression,
    featureFields: state.computation.featureFields,
    targetField: state.computation.targetField,
    outputConfig: {
      revealMode: state.computation.revealMode as 'coefficients' | 'scores' | 'both',
      clipMin: state.computation.clipMin ? parseFloat(state.computation.clipMin) : undefined,
      clipMax: state.computation.clipMax ? parseFloat(state.computation.clipMax) : undefined,
      normalize: state.computation.normalize,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function buildGovernanceSpec(state: WizardState): GovernanceSpec {
  const now = Date.now();
  const g = state.governance;
  const gov: GovernanceSpec = {
    specId: generateSpecId('gov'),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: `${state.basics.name} Governance`,
    membershipPolicy: {
      minActiveMembers: g.minActiveMembers,
      maxMembers: g.maxMembers ? parseInt(g.maxMembers, 10) : undefined,
    },
    visibilityPolicy: {
      mode: g.visibilityMode as VisibilityMode,
      sectionVisibility:
        g.visibilityMode === 'partial'
          ? (g.sectionVisibility as GovernanceSpec['visibilityPolicy']['sectionVisibility'])
          : undefined,
    },
    joinPolicy: {
      approvalTimeoutMs: g.approvalTimeoutMs,
      acceptanceTimeoutMs: g.acceptanceTimeoutMs,
    },
    consensusPolicy: {
      admissionSchedule: g.admissionSchedule,
      dissolutionThreshold: g.dissolutionThreshold,
      expulsionThreshold: g.expulsionThreshold ? parseFloat(g.expulsionThreshold) : undefined,
    },
    runPolicy: {
      initiationMode: RunInitiationMode.RestrictedManual,
      allowedInitiators: g.allowedInitiators as 'any_member' | 'creator_only',
      minimumIntervalMs: g.minimumIntervalMs,
      maxRunsPerPeriod: g.maxRunsPerPeriod,
      periodLengthDays: g.periodLengthDays,
      requireCostEstimate: g.requireCostEstimate,
      allMembersOnlineRequired: g.allMembersOnlineRequired,
      midRunDisconnectBehavior: DisconnectBehavior.Abort,
    },
    dissolutionPolicy: {
      preActivationTimeoutMs: g.preActivationTimeoutMs,
      postActivationInactivityTimeoutMs: g.postActivationInactivityTimeoutMs,
      warnBeforeDissolveMs: g.warnBeforeDissolveMs ? parseInt(g.warnBeforeDissolveMs, 10) : undefined,
    },
    createdAt: now,
    updatedAt: now,
  };

  if (g.expulsionEnabled) {
    gov.expulsionPolicy = {
      enabled: true,
      requireReason: g.expulsionRequireReason,
    };
  }

  return gov;
}

export function buildEconomicSpec(state: WizardState): EconomicSpec {
  const now = Date.now();
  const e = state.economic;
  const spec: EconomicSpec = {
    specId: generateSpecId('econ'),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: `${state.basics.name} Economics`,
    economicMode: e.economicMode as EconomicMode,
    costAllocation: {
      fixedCostPerRun: e.fixedCostPerRun,
      variableCostEnabled: e.variableCostEnabled,
      variableCostDescription: e.variableCostDescription || undefined,
    },
    summary: e.summary,
    createdAt: now,
    updatedAt: now,
  };

  if (e.maxTotalBudget || e.maxBudgetPerPeriod || e.budgetPeriodLengthDays) {
    spec.budgetCap = {
      maxTotalBudget: e.maxTotalBudget ? parseFloat(e.maxTotalBudget) : undefined,
      maxBudgetPerPeriod: e.maxBudgetPerPeriod ? parseFloat(e.maxBudgetPerPeriod) : undefined,
      periodLengthDays: e.budgetPeriodLengthDays ? parseInt(e.budgetPeriodLengthDays, 10) : undefined,
    };
  }

  return spec;
}

// ---- Validation helpers ----

export function validateBasics(state: WizardState): string[] {
  const errors: string[] = [];
  if (!state.basics.name || state.basics.name.length < 3)
    errors.push('Network name must be at least 3 characters');
  if (state.basics.name.length > 100) errors.push('Network name must be at most 100 characters');
  if (state.basics.description.length > 500)
    errors.push('Description must be at most 500 characters');
  return errors;
}

export function validateSchemaStep(state: WizardState): string[] {
  const spec = buildSchemaSpec(state);
  const result = schemaSpecSchema.safeParse(spec);
  if (result.success) return [];
  return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

export function validateComputationStep(state: WizardState): string[] {
  const spec = buildComputationSpec(state);
  const result = computationSpecSchema.safeParse(spec);
  if (result.success) return [];
  return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

export function validateGovernanceStep(state: WizardState): string[] {
  const spec = buildGovernanceSpec(state);
  const result = governanceSpecSchema.safeParse(spec);
  if (result.success) return [];
  return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

export function validateEconomicStep(state: WizardState): string[] {
  const spec = buildEconomicSpec(state);
  const result = economicSpecSchema.safeParse(spec);
  if (result.success) return [];
  return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

// ---- Hook ----

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, defaultState);

  const setStep = useCallback((step: number) => dispatch({ type: 'SET_STEP', step }), []);
  const updateBasics = useCallback(
    (data: Partial<BasicsData>) => dispatch({ type: 'UPDATE_BASICS', data }),
    [],
  );
  const updateSchema = useCallback(
    (data: Partial<SchemaData>) => dispatch({ type: 'UPDATE_SCHEMA', data }),
    [],
  );
  const updateComputation = useCallback(
    (data: Partial<ComputationData>) => dispatch({ type: 'UPDATE_COMPUTATION', data }),
    [],
  );
  const updateGovernance = useCallback(
    (data: Partial<GovernanceData>) => dispatch({ type: 'UPDATE_GOVERNANCE', data }),
    [],
  );
  const updateEconomic = useCallback(
    (data: Partial<EconomicData>) => dispatch({ type: 'UPDATE_ECONOMIC', data }),
    [],
  );
  const setAcknowledged = useCallback(
    (value: boolean) => dispatch({ type: 'SET_ACKNOWLEDGED', value }),
    [],
  );
  const setStepValid = useCallback(
    (step: number, valid: boolean) => dispatch({ type: 'SET_STEP_VALID', step, valid }),
    [],
  );
  const loadTemplate = useCallback(
    (partial: Partial<WizardState>) => dispatch({ type: 'LOAD_TEMPLATE', state: partial }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    setStep,
    updateBasics,
    updateSchema,
    updateComputation,
    updateGovernance,
    updateEconomic,
    setAcknowledged,
    setStepValid,
    loadTemplate,
    reset,
  };
}
