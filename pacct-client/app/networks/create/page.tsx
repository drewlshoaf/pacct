'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  schemaSpecSchema,
  computationSpecSchema,
  governanceSpecSchema,
  economicSpecSchema,
  validateSpecCompatibility,
  createNetworkSnapshot,
} from '@pacct/specs';
import type { NetworkId, NodeId } from '@pacct/protocol-ts';
import { DiscoveryClient } from '@/lib/discovery/discovery-client';
import WizardShell from './components/WizardShell';
import StepBasics from './components/StepBasics';
import StepSchema from './components/StepSchema';
import StepComputation from './components/StepComputation';
import StepGovernance from './components/StepGovernance';
import StepEconomics from './components/StepEconomics';
import StepReview from './components/StepReview';
import {
  useWizardState,
  validateBasics,
  validateSchemaStep,
  validateComputationStep,
  validateGovernanceStep,
  validateEconomicStep,
  buildSchemaSpec,
  buildComputationSpec,
  buildGovernanceSpec,
  buildEconomicSpec,
  WIZARD_STEPS,
} from './wizard-state';

export default function CreateNetworkPage() {
  const router = useRouter();
  const {
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
  } = useWizardState();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  // Validation for current step
  const currentStepErrors = useMemo((): string[] => {
    switch (state.currentStep) {
      case 0:
        return validateBasics(state);
      case 1:
        return validateSchemaStep(state);
      case 2:
        return validateComputationStep(state);
      case 3:
        return validateGovernanceStep(state);
      case 4:
        return validateEconomicStep(state);
      case 5: {
        // Review step: all must pass
        const all = [
          ...validateBasics(state),
          ...validateSchemaStep(state),
          ...validateComputationStep(state),
          ...validateGovernanceStep(state),
          ...validateEconomicStep(state),
        ];
        if (!state.acknowledged) all.push('You must acknowledge the immutability terms.');
        return all;
      }
      default:
        return [];
    }
  }, [state]);

  const canProceed = currentStepErrors.length === 0;

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    setStepValid(state.currentStep, true);
    if (state.currentStep < WIZARD_STEPS.length - 1) {
      setStep(state.currentStep + 1);
    }
  }, [canProceed, state.currentStep, setStep, setStepValid]);

  const handleBack = useCallback(() => {
    if (state.currentStep > 0) {
      setStep(state.currentStep - 1);
    }
  }, [state.currentStep, setStep]);

  const handleStepClick = useCallback(
    (step: number) => {
      // Allow navigating to any previously visited or current step
      if (step <= state.currentStep) {
        setStep(step);
      }
      // Allow jumping forward if current step is valid
      if (step > state.currentStep && canProceed) {
        setStepValid(state.currentStep, true);
        setStep(step);
      }
    },
    [state.currentStep, canProceed, setStep, setStepValid],
  );

  const handleLoadTemplate = useCallback(
    (partial: {
      schema?: Parameters<typeof updateSchema>[0];
      computation?: Parameters<typeof updateComputation>[0];
      governance?: Parameters<typeof updateGovernance>[0];
      economic?: Parameters<typeof updateEconomic>[0];
    }) => {
      if (partial.schema) updateSchema(partial.schema);
      if (partial.computation) updateComputation(partial.computation);
      if (partial.governance) updateGovernance(partial.governance);
      if (partial.economic) updateEconomic(partial.economic);
    },
    [updateSchema, updateComputation, updateGovernance, updateEconomic],
  );

  const handleCreate = useCallback(async () => {
    setCreateError(null);
    setCreating(true);

    try {
      // Build all specs
      const schemaSpec = buildSchemaSpec(state);
      const computationSpec = buildComputationSpec(state);
      const governanceSpec = buildGovernanceSpec(state);
      const economicSpec = buildEconomicSpec(state);

      // Validate all specs individually
      const schemaResult = schemaSpecSchema.safeParse(schemaSpec);
      if (!schemaResult.success) {
        throw new Error(`Schema validation failed: ${schemaResult.error.issues.map((i) => i.message).join(', ')}`);
      }
      const compResult = computationSpecSchema.safeParse(computationSpec);
      if (!compResult.success) {
        throw new Error(`Computation validation failed: ${compResult.error.issues.map((i) => i.message).join(', ')}`);
      }
      const govResult = governanceSpecSchema.safeParse(governanceSpec);
      if (!govResult.success) {
        throw new Error(`Governance validation failed: ${govResult.error.issues.map((i) => i.message).join(', ')}`);
      }
      const econResult = economicSpecSchema.safeParse(economicSpec);
      if (!econResult.success) {
        throw new Error(`Economic validation failed: ${econResult.error.issues.map((i) => i.message).join(', ')}`);
      }

      // Cross-spec validation
      const crossResult = validateSpecCompatibility(schemaSpec, computationSpec, governanceSpec, economicSpec);
      if (!crossResult.valid) {
        throw new Error(`Cross-spec validation failed: ${crossResult.errors.map((e) => e.message).join(', ')}`);
      }

      // Generate network ID
      const networkId = `net-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as NetworkId;
      const creatorNodeId = `node-creator-${Date.now()}` as NodeId;

      // Create snapshot
      const snapshot = await createNetworkSnapshot(
        schemaSpec,
        computationSpec,
        governanceSpec,
        economicSpec,
        networkId,
        creatorNodeId,
      );

      // Register with discovery server
      const discoveryUrl =
        process.env.NEXT_PUBLIC_DISCOVERY_URL ?? 'http://localhost:3001';
      const client = new DiscoveryClient(discoveryUrl);

      try {
        await client.registerNetwork({
          networkId: snapshot.networkId,
          alias: state.basics.name,
          creatorNodeId,
          manifest: snapshot,
        });
      } catch {
        // Discovery server unreachable — save locally and notify the user
        console.warn('Discovery server unreachable; network saved locally.');
        setOfflineNotice(
          'Network created locally but could not be registered with the discovery server. It will be registered when the server becomes available.',
        );
      }

      // Navigate to network detail page
      router.push(`/networks/${snapshot.networkId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create network');
    } finally {
      setCreating(false);
    }
  }, [state, router]);

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <StepBasics
            data={state.basics}
            onChange={updateBasics}
            onLoadTemplate={handleLoadTemplate}
            errors={currentStepErrors}
          />
        );
      case 1:
        return (
          <StepSchema data={state.schema} onChange={updateSchema} errors={currentStepErrors} />
        );
      case 2:
        return (
          <StepComputation
            data={state.computation}
            schemaFields={state.schema.fields}
            onChange={updateComputation}
            errors={currentStepErrors}
          />
        );
      case 3:
        return (
          <StepGovernance
            data={state.governance}
            onChange={updateGovernance}
            errors={currentStepErrors}
          />
        );
      case 4:
        return (
          <StepEconomics
            data={state.economic}
            onChange={updateEconomic}
            errors={currentStepErrors}
          />
        );
      case 5:
        return (
          <StepReview
            state={state}
            acknowledged={state.acknowledged}
            onSetAcknowledged={setAcknowledged}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <WizardShell
        currentStep={state.currentStep}
        stepValidation={state.stepValidation}
        onBack={handleBack}
        onNext={handleNext}
        onStepClick={handleStepClick}
        isFirstStep={state.currentStep === 0}
        isLastStep={state.currentStep === WIZARD_STEPS.length - 1}
        canProceed={canProceed}
        onCreateClick={handleCreate}
        creating={creating}
      >
        {renderStep()}
      </WizardShell>

      {createError && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">Creation Error</p>
            <p className="text-sm text-red-700 mt-1">{createError}</p>
          </div>
        </div>
      )}

      {offlineNotice && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800">Offline Notice</p>
            <p className="text-sm text-yellow-700 mt-1">{offlineNotice}</p>
          </div>
        </div>
      )}
    </>
  );
}
