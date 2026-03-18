'use client';

import type { ScenarioMetadata, Variable, SecretRef } from '../../types';
import BasicInfoSection from './BasicInfoSection';
import EnvironmentSection from './EnvironmentSection';
import OwnershipSection from './OwnershipSection';
import VariablesSection from './VariablesSection';
import SecretsSection from './SecretsSection';

interface Props {
  metadata: ScenarioMetadata;
  errors: Record<string, string>;
  onUpdateField: <K extends keyof ScenarioMetadata>(field: K, value: ScenarioMetadata[K]) => void;
  onSetTags: (tags: string[]) => void;
  onSetVariables: (variables: Variable[]) => void;
  onSetSecrets: (secrets: SecretRef[]) => void;
}

export default function MetadataTab({
  metadata, errors, onUpdateField, onSetTags, onSetVariables, onSetSecrets,
}: Props) {
  return (
    <div className="space-y-4 p-5">
      <BasicInfoSection
        name={metadata.name}
        description={metadata.description}
        tags={metadata.tags}
        onNameChange={v => onUpdateField('name', v)}
        onDescriptionChange={v => onUpdateField('description', v)}
        onTagsChange={onSetTags}
        errors={errors}
      />
      <EnvironmentSection
        baseUrl={metadata.base_url}
        defaultTimeoutMs={metadata.default_timeout_ms}
        onBaseUrlChange={v => onUpdateField('base_url', v)}
        onTimeoutChange={v => onUpdateField('default_timeout_ms', v)}
      />
      <OwnershipSection
        owner={metadata.owner}
        version={metadata.version}
        onOwnerChange={v => onUpdateField('owner', v)}
      />
      <VariablesSection
        variables={metadata.global_variables}
        onChange={onSetVariables}
      />
      <SecretsSection
        secrets={metadata.secret_refs}
        onChange={onSetSecrets}
      />
    </div>
  );
}
