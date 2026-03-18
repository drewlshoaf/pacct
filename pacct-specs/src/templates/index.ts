import {
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  VisibilityMode,
  SectionVisibility,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';
import type { SpecId, Timestamp } from '@pacct/protocol-ts';
import type { SchemaSpec } from '../schema/types';
import type { ComputationSpec } from '../computation/types';
import type { GovernanceSpec } from '../governance/types';
import type { EconomicSpec } from '../economic/types';

export interface SpecTemplate {
  category: string;
  description: string;
  schema: SchemaSpec;
  computation: ComputationSpec;
  governance: GovernanceSpec;
  economic: EconomicSpec;
}

function makeTimestamps(): { createdAt: Timestamp; updatedAt: Timestamp } {
  const now = Date.now();
  return { createdAt: now, updatedAt: now };
}

function baseGovernance(overrides: Partial<GovernanceSpec> = {}): GovernanceSpec {
  const ts = makeTimestamps();
  return {
    specId: 'gov-template' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Default Governance',
    membershipPolicy: {
      minActiveMembers: 3,
      maxMembers: 10,
    },
    visibilityPolicy: {
      mode: VisibilityMode.Full,
    },
    joinPolicy: {
      approvalTimeoutMs: 86400000,
      acceptanceTimeoutMs: 86400000,
    },
    consensusPolicy: {
      admissionSchedule: [
        { memberCountMin: 1, memberCountMax: 5, threshold: 1.0 },
        { memberCountMin: 6, memberCountMax: 10, threshold: 0.75 },
      ],
      dissolutionThreshold: 0.75,
    },
    runPolicy: {
      initiationMode: RunInitiationMode.RestrictedManual,
      allowedInitiators: 'any_member',
      minimumIntervalMs: 3600000,
      maxRunsPerPeriod: 10,
      periodLengthDays: 30,
      requireCostEstimate: false,
      allMembersOnlineRequired: true,
      midRunDisconnectBehavior: DisconnectBehavior.Abort,
    },
    dissolutionPolicy: {
      preActivationTimeoutMs: 604800000,
      postActivationInactivityTimeoutMs: 2592000000,
    },
    ...ts,
    ...overrides,
  };
}

function baseEconomic(overrides: Partial<EconomicSpec> = {}): EconomicSpec {
  const ts = makeTimestamps();
  return {
    specId: 'econ-template' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Default Economic',
    economicMode: EconomicMode.Progressive,
    costAllocation: {
      fixedCostPerRun: 0,
      variableCostEnabled: false,
    },
    summary: 'Default cost-sharing arrangement',
    ...ts,
    ...overrides,
  };
}

const genericTemplate: SpecTemplate = {
  category: 'generic',
  description: 'A generic template for collaborative analytics',
  schema: {
    specId: 'schema-generic' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Generic Schema',
    description: 'A basic schema with common field types',
    fields: [
      { name: 'record_id', type: 'string_id', required: true, description: 'Unique record identifier' },
      { name: 'value', type: 'float', required: true, description: 'Numeric value' },
      { name: 'score', type: 'integer', required: true, description: 'Integer score' },
      { name: 'active', type: 'boolean', required: false, description: 'Active flag' },
    ],
    identifierFieldName: 'record_id',
    ...makeTimestamps(),
  },
  computation: {
    specId: 'comp-generic' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Generic Computation',
    description: 'Simple regression on generic data',
    computationType: ComputationType.Regression,
    featureFields: ['value', 'active'],
    targetField: 'score',
    outputConfig: {
      revealMode: 'coefficients',
      normalize: true,
    },
    ...makeTimestamps(),
  },
  governance: baseGovernance({
    specId: 'gov-generic' as SpecId,
    name: 'Generic Governance',
  }),
  economic: baseEconomic({
    specId: 'econ-generic' as SpecId,
    name: 'Generic Economic',
    summary: 'Equal cost sharing for generic analytics',
  }),
};

const educationTemplate: SpecTemplate = {
  category: 'education',
  description: 'Template for educational institution collaboration on student outcomes',
  schema: {
    specId: 'schema-education' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Education Schema',
    description: 'Student outcome data schema',
    fields: [
      { name: 'student_id', type: 'string_id', required: true, description: 'Anonymized student identifier' },
      { name: 'gpa', type: 'float', required: true, description: 'Grade point average', min: 0, max: 4.0 },
      { name: 'credits_completed', type: 'integer', required: true, description: 'Total credits completed', min: 0 },
      { name: 'graduation_status', type: 'enum', required: true, description: 'Current graduation status', enumValues: ['enrolled', 'graduated', 'withdrawn', 'transferred'] },
      { name: 'retention_score', type: 'float', required: true, description: 'Predicted retention score', min: 0, max: 1 },
      { name: 'financial_aid', type: 'boolean', required: false, description: 'Receiving financial aid' },
    ],
    identifierFieldName: 'student_id',
    ...makeTimestamps(),
  },
  computation: {
    specId: 'comp-education' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Education Computation',
    description: 'Regression analysis of student retention factors',
    computationType: ComputationType.Regression,
    featureFields: ['gpa', 'credits_completed', 'financial_aid'],
    targetField: 'retention_score',
    outputConfig: {
      revealMode: 'both',
      clipMin: 0,
      clipMax: 1,
      normalize: true,
    },
    ...makeTimestamps(),
  },
  governance: baseGovernance({
    specId: 'gov-education' as SpecId,
    name: 'Education Governance',
    description: 'Governance for educational institution collaboration',
    visibilityPolicy: {
      mode: VisibilityMode.Partial,
      sectionVisibility: {
        schema: SectionVisibility.Full,
        computation: SectionVisibility.SummaryOnly,
        governance: SectionVisibility.Full,
        economic: SectionVisibility.Hidden,
      },
    },
  }),
  economic: baseEconomic({
    specId: 'econ-education' as SpecId,
    name: 'Education Economic',
    economicMode: EconomicMode.SocialistHybrid,
    summary: 'Cost sharing based on institutional size',
  }),
};

const healthcareTemplate: SpecTemplate = {
  category: 'healthcare',
  description: 'Template for healthcare organizations collaborating on patient outcome analytics',
  schema: {
    specId: 'schema-healthcare' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Healthcare Schema',
    description: 'Patient outcome data schema',
    fields: [
      { name: 'patient_id', type: 'string_id', required: true, description: 'Anonymized patient identifier' },
      { name: 'age', type: 'integer', required: true, description: 'Patient age', min: 0, max: 150 },
      { name: 'bmi', type: 'float', required: true, description: 'Body mass index', min: 10, max: 80 },
      { name: 'readmission_risk', type: 'float', required: true, description: 'Predicted readmission risk score', min: 0, max: 1 },
      { name: 'chronic_condition', type: 'boolean', required: false, description: 'Has chronic condition' },
      { name: 'insurance_type', type: 'enum', required: true, description: 'Type of insurance', enumValues: ['private', 'public', 'uninsured'] },
    ],
    identifierFieldName: 'patient_id',
    ...makeTimestamps(),
  },
  computation: {
    specId: 'comp-healthcare' as SpecId,
    lifecycle: SpecLifecycle.Template,
    version: '1.0.0',
    name: 'Healthcare Computation',
    description: 'Regression analysis of readmission risk factors',
    computationType: ComputationType.Regression,
    featureFields: ['age', 'bmi', 'chronic_condition'],
    targetField: 'readmission_risk',
    outputConfig: {
      revealMode: 'scores',
      clipMin: 0,
      clipMax: 1,
      normalize: true,
    },
    ...makeTimestamps(),
  },
  governance: baseGovernance({
    specId: 'gov-healthcare' as SpecId,
    name: 'Healthcare Governance',
    description: 'Governance for healthcare organization collaboration',
    membershipPolicy: {
      minActiveMembers: 3,
      maxMembers: 20,
    },
    expulsionPolicy: {
      enabled: true,
      requireReason: true,
    },
  }),
  economic: baseEconomic({
    specId: 'econ-healthcare' as SpecId,
    name: 'Healthcare Economic',
    economicMode: EconomicMode.Capitalist,
    costAllocation: {
      fixedCostPerRun: 100,
      variableCostEnabled: true,
      variableCostDescription: 'Variable cost based on dataset size',
    },
    summary: 'Market-based cost allocation for healthcare analytics',
  }),
};

const templates: Map<string, SpecTemplate> = new Map([
  ['generic', genericTemplate],
  ['education', educationTemplate],
  ['healthcare', healthcareTemplate],
]);

export function getTemplate(category: string): SpecTemplate | undefined {
  return templates.get(category);
}

export function listTemplates(): { category: string; description: string }[] {
  return Array.from(templates.values()).map(t => ({
    category: t.category,
    description: t.description,
  }));
}
