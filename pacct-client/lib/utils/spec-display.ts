import type { SchemaSpec } from '@pacct/specs';
import type { ComputationSpec } from '@pacct/specs';
import type { GovernanceSpec } from '@pacct/specs';
import type { EconomicSpec } from '@pacct/specs';
import { formatDuration } from './duration';

const FIELD_TYPE_LABELS: Record<string, string> = {
  integer: 'Integer',
  float: 'Float (Decimal)',
  boolean: 'Boolean',
  enum: 'Enum (Choice)',
  string_id: 'String Identifier',
};

const ECONOMIC_MODE_LABELS: Record<string, string> = {
  capitalist: 'Capitalist (Market-Based)',
  progressive: 'Progressive (Scaled)',
  socialist_hybrid: 'Socialist Hybrid (Equal Share)',
};

export function getFieldTypeLabel(type: string): string {
  return FIELD_TYPE_LABELS[type] ?? type;
}

export function getEconomicModeLabel(mode: string): string {
  return ECONOMIC_MODE_LABELS[mode] ?? mode;
}

export function renderSchemaSpecSummary(spec: SchemaSpec): string {
  const lines: string[] = [
    `Schema: ${spec.name}`,
    spec.description ? `Description: ${spec.description}` : '',
    `Fields (${spec.fields.length}):`,
  ];

  for (const field of spec.fields) {
    const constraints: string[] = [];
    if (field.required) constraints.push('required');
    if (field.min !== undefined) constraints.push(`min: ${field.min}`);
    if (field.max !== undefined) constraints.push(`max: ${field.max}`);
    if (field.enumValues?.length) constraints.push(`values: ${field.enumValues.join(', ')}`);
    const constraintStr = constraints.length > 0 ? ` (${constraints.join(', ')})` : '';
    lines.push(`  - ${field.name}: ${getFieldTypeLabel(field.type)}${constraintStr}`);
  }

  lines.push(`Identifier: ${spec.identifierFieldName}`);
  return lines.filter(Boolean).join('\n');
}

export function renderComputationSpecSummary(spec: ComputationSpec): string {
  const lines: string[] = [
    `Computation: ${spec.name}`,
    spec.description ? `Description: ${spec.description}` : '',
    `Type: ${spec.computationType}`,
    `Feature Fields: ${spec.featureFields.join(', ')}`,
    `Target Field: ${spec.targetField}`,
    `Reveal Mode: ${spec.outputConfig.revealMode}`,
    `Normalize: ${spec.outputConfig.normalize ? 'Yes' : 'No'}`,
  ];
  if (spec.outputConfig.clipMin !== undefined) lines.push(`Clip Min: ${spec.outputConfig.clipMin}`);
  if (spec.outputConfig.clipMax !== undefined) lines.push(`Clip Max: ${spec.outputConfig.clipMax}`);
  return lines.filter(Boolean).join('\n');
}

export function renderGovernanceSpecSummary(spec: GovernanceSpec): string {
  const lines: string[] = [
    `Governance: ${spec.name}`,
    spec.description ? `Description: ${spec.description}` : '',
    `Min Active Members: ${spec.membershipPolicy.minActiveMembers}`,
    spec.membershipPolicy.maxMembers ? `Max Members: ${spec.membershipPolicy.maxMembers}` : '',
    `Visibility: ${spec.visibilityPolicy.mode}`,
    `Approval Timeout: ${formatDuration(spec.joinPolicy.approvalTimeoutMs)}`,
    `Acceptance Timeout: ${formatDuration(spec.joinPolicy.acceptanceTimeoutMs)}`,
    `Run Initiators: ${spec.runPolicy.allowedInitiators === 'any_member' ? 'Any Member' : 'Creator Only'}`,
    `Max Runs Per Period: ${spec.runPolicy.maxRunsPerPeriod} per ${spec.runPolicy.periodLengthDays} days`,
    `Minimum Run Interval: ${formatDuration(spec.runPolicy.minimumIntervalMs)}`,
    `All Members Online Required: ${spec.runPolicy.allMembersOnlineRequired ? 'Yes' : 'No'}`,
    `Pre-Activation Timeout: ${formatDuration(spec.dissolutionPolicy.preActivationTimeoutMs)}`,
    `Inactivity Timeout: ${formatDuration(spec.dissolutionPolicy.postActivationInactivityTimeoutMs)}`,
  ];

  if (spec.expulsionPolicy?.enabled) {
    lines.push('Expulsion: Enabled');
    if (spec.expulsionPolicy.requireReason) lines.push('  Reason Required: Yes');
  }

  return lines.filter(Boolean).join('\n');
}

export function renderEconomicSpecSummary(spec: EconomicSpec): string {
  const lines: string[] = [
    `Economics: ${spec.name}`,
    spec.description ? `Description: ${spec.description}` : '',
    `Mode: ${getEconomicModeLabel(spec.economicMode)}`,
    spec.costAllocation.fixedCostPerRun !== undefined
      ? `Fixed Cost Per Run: ${spec.costAllocation.fixedCostPerRun}`
      : '',
    `Variable Costs: ${spec.costAllocation.variableCostEnabled ? 'Enabled' : 'Disabled'}`,
    spec.costAllocation.variableCostDescription
      ? `Variable Cost Details: ${spec.costAllocation.variableCostDescription}`
      : '',
  ];

  if (spec.budgetCap) {
    if (spec.budgetCap.maxTotalBudget !== undefined)
      lines.push(`Max Total Budget: ${spec.budgetCap.maxTotalBudget}`);
    if (spec.budgetCap.maxBudgetPerPeriod !== undefined)
      lines.push(`Max Budget Per Period: ${spec.budgetCap.maxBudgetPerPeriod}`);
    if (spec.budgetCap.periodLengthDays !== undefined)
      lines.push(`Budget Period: ${spec.budgetCap.periodLengthDays} days`);
  }

  lines.push(`Summary: ${spec.summary}`);
  return lines.filter(Boolean).join('\n');
}
